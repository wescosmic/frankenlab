/**
 * FrankenLab — Electronics engine.
 *
 * Circuit analysis uses Modified Nodal Analysis (MNA): voltages at nodes and
 * currents through voltage sources are solved simultaneously as one linear
 * system. This is the standard method for resistor networks and it produces
 * genuinely correct node voltages rather than scripted answers.
 *
 * The engine solves at network level (see `electronicsNetworkSolver`), because
 * a resistor's voltage depends on the whole circuit it belongs to. Per-
 * component behaviour then reports the solved values and reacts to them.
 *
 * Scope is deliberately narrow. This is a teaching simulator, not SPICE:
 *   - DC operating point for resistive networks
 *   - a piecewise-linear LED model evaluated from the solved node voltages
 *   - switches as ideal open/short elements
 *
 * Every value is unit-aware and every run is deterministic.
 */

import type {
  ComponentBehavior,
  ComponentDefinition,
  ConnectionRule,
  DisciplineEngine,
  NetworkSolver,
  Observation,
  ParameterValue,
  Quantity,
} from '../../kernel/types';
import { quantity } from '../../kernel/units';

export interface BranchState {
  resistance: Quantity;
  voltage: Quantity;
  current: Quantity;
  conducting: boolean;
}

/**
 * Solves a dense linear system Ax = b by Gaussian elimination with partial
 * pivoting. Rows are augmented with the right-hand side.
 */
export function solveLinearSystem(matrix: number[][], rhs: number[]): number[] | null {
  const n = rhs.length;
  const a = matrix.map((row, i) => [...row, rhs[i]!]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let best = Math.abs(a[col]![col]!);
    for (let row = col + 1; row < n; row++) {
      const candidate = Math.abs(a[row]![col]!);
      if (candidate > best) {
        best = candidate;
        pivotRow = row;
      }
    }
    if (best < 1e-12) return null; // singular
    if (pivotRow !== col) {
      const tmp = a[col]!;
      a[col] = a[pivotRow]!;
      a[pivotRow] = tmp;
    }
    const pivot = a[col]![col]!;
    for (let row = col + 1; row < n; row++) {
      const factor = a[row]![col]! / pivot;
      if (factor === 0) continue;
      for (let k = col; k <= n; k++) {
        a[row]![k] = a[row]![k]! - factor * a[col]![k]!;
      }
    }
  }

  const solution = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let sum = a[row]![n]!;
    for (let k = row + 1; k < n; k++) {
      sum -= a[row]![k]! * solution[k]!;
    }
    solution[row] = sum / a[row]![row]!;
  }
  return solution;
}

/** A node in the circuit graph, identified by the terminal that occupies it. */
type TerminalId = string;

interface ResistorLike {
  readonly componentId: string;
  readonly nodeA: TerminalId;
  readonly nodeB: TerminalId;
  readonly resistance: number;
  readonly kind: 'fixed' | 'variable' | 'switch';
}

interface VoltageSourceLike {
  readonly componentId: string;
  readonly nodeA: TerminalId;
  readonly nodeB: TerminalId;
  readonly voltage: number;
}

/**
 * The circuit graph for one electronics subgraph.
 *
 * Terminals that are wired together become the same node. Union-find gives
 * that for free and handles the rewiring that happens when the user drags a
 * component around.
 */
class UnionFind<T> {
  readonly #parent = new Map<T, T>();

  find(id: T): T {
    this.add(id);
    let current = id;
    while (this.#parent.get(current) !== current) {
      const parent = this.#parent.get(current)!;
      this.#parent.set(current, this.#parent.get(parent)!);
      current = this.#parent.get(parent)!;
    }
    return current;
  }

  union(a: T, b: T): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA !== rootB) this.#parent.set(rootA, rootB);
  }

  add(id: T): void {
    if (!this.#parent.has(id)) this.#parent.set(id, id);
  }
}

/**
 * Network-level solver for the electronics discipline.
 *
 * Builds the circuit graph from the terminal connections, stamps the MNA
 * matrix, solves it, and returns the solved node voltage and branch current
 * for every component.
 */
export const electronicsNetworkSolver: NetworkSolver = {
  discipline: 'electronics',

  solve(input) {
    const results = new Map<string, Record<string, Quantity>>();

    // --- Build the graph -------------------------------------------------
    const uf = new UnionFind<string>();

    // Terminals are discovered from the component's port definitions rather
    // than assumed. A component's terminal ids are whatever its ports say
    // they are, and the solver must not hard-code them.
    const terminalsOf = (componentId: string): string[] => {
      const component = input.components.find((c) => c.id === componentId);
      if (!component) return [];
      const ports = input.componentPorts.get(component.type) ?? [];
      return ports
        .filter((port) => port.channel === 'electrical-potential')
        .map((port) => `${componentId}:${port.id}`);
    };

    for (const component of input.components) {
      for (const terminal of terminalsOf(component.id)) uf.add(terminal);
    }

    // Electrical-potential connections join terminals into shared nodes.
    for (const connection of input.connections) {
      if (connection.channel !== 'electrical-potential') continue;
      uf.union(
        `${connection.source.componentId}:${connection.source.portId}`,
        `${connection.target.componentId}:${connection.target.portId}`,
      );
    }

    const nodeIndex = new Map<TerminalId, number>();

    const nodeOf = (terminal: TerminalId): number => {
      const root = uf.find(terminal);
      let index = nodeIndex.get(root);
      if (index === undefined) {
        index = nodeIndex.size;
        nodeIndex.set(root, index);
      }
      return index;
    };

    /**
     * Resolve a terminal's node without creating one.
     *
     * Used for components that are not part of the linear solve (an LED used
     * as an indicator, for example). Creating a node for them would add an
     * unknown to the system that no element ever stamps, which makes the
     * matrix singular.
     */
    const lookupNode = (terminal: TerminalId): number | undefined =>
      nodeIndex.get(uf.find(terminal));

    // --- Collect elements ------------------------------------------------
    const resistors: ResistorLike[] = [];
    const sources: VoltageSourceLike[] = [];

    for (const component of input.components) {
      const state = input.states.get(component.id) ?? {};
      const params = state as {
        __param_resistance?: number;
        __param_voltage?: number;
        __param_closed?: boolean;
        __param_resistance_at_zero?: number;
        __param_resistance_at_full?: number;
      };
      const terminals = terminalsOf(component.id);

      if (component.type === 'electronics.resistor') {
        resistors.push({
          componentId: component.id,
          nodeA: terminals[0] ?? `${component.id}:terminal_a`,
          nodeB: terminals[1] ?? `${component.id}:terminal_b`,
          resistance: params.__param_resistance ?? 1000,
          kind: 'fixed',
        });
      } else if (component.type === 'electronics.sensor') {
        // A sensor is a resistor whose value depends on an external quantity.
        // As the medium dries, the sensed value falls and the sensor's
        // resistance rises, which raises the divider voltage — so the
        // comparator genuinely thresholds a circuit quantity.
        const sense = input.resolvedInputs.get(`${component.id}:sense`);
        const normalised = sense ? Math.min(1, Math.max(0, sense.value)) : 0;
        const r0 = (params.__param_resistance_at_zero as number | undefined) ?? 20;
        const r1 = (params.__param_resistance_at_full as number | undefined) ?? 2;
        const ohms = (r0 + (r1 - r0) * normalised) * 1000;
        resistors.push({
          componentId: component.id,
          nodeA: terminals[0] ?? `${component.id}:terminal_a`,
          nodeB: terminals[1] ?? `${component.id}:terminal_b`,
          resistance: Math.max(1, ohms),
          kind: 'variable',
        });
      } else if (component.type === 'electronics.switch') {
        const closed = params.__param_closed ?? true;
        resistors.push({
          componentId: component.id,
          nodeA: terminals[0] ?? `${component.id}:terminal_a`,
          nodeB: terminals[1] ?? `${component.id}:terminal_b`,
          resistance: closed ? 1e-3 : 1e9,
          kind: 'switch',
        });
      } else if (component.type === 'electronics.voltage-source' || component.type === 'biology.bio-battery') {
        const dynamicVoltage = (state as { outputs?: Record<string, Quantity> }).outputs?.voltage?.value;
        sources.push({
          componentId: component.id,
          nodeA: terminals[0] ?? `${component.id}:positive`,
          nodeB: terminals[1] ?? `${component.id}:negative`,
          voltage: params.__param_voltage ?? dynamicVoltage ?? 5,
        });
      }
    }

    if (resistors.length === 0 && sources.length === 0) return results;

    // --- Node numbering ---------------------------------------------------
    // Every node that carries an element stamp is indexed *before* the reduced
    // unknown set is built. Indexing lazily while stamping would leave most
    // nodes out of the unknown set, and a matrix with unstamped unknowns is
    // singular — the solve then "succeeds" with zeros for everything.
    for (const resistor of resistors) {
      nodeOf(resistor.nodeA);
      nodeOf(resistor.nodeB);
    }
    for (const source of sources) {
      nodeOf(source.nodeA);
      nodeOf(source.nodeB);
    }

    // --- Floating islands -------------------------------------------------
    // A part the user has dropped on the bench but not wired in — a spare
    // switch, a second battery — forms its own island of nodes. Nothing
    // connects that island to a source, so the equations for those nodes have
    // no unique solution. Left in the matrix they make the whole system
    // singular, and every reading in the circuit drops to zero because of a
    // part that is not even in the circuit.
    //
    // So the islands are found first, and the ones that cannot carry current
    // are dropped before the matrix is built. An island is a set of nodes
    // joined by elements: wires make two terminals the same node, and an
    // element carries current from one node to the next.
    const islands = new UnionFind<number>();
    for (const resistor of resistors) {
      islands.union(nodeOf(resistor.nodeA), nodeOf(resistor.nodeB));
    }
    for (const source of sources) {
      islands.union(nodeOf(source.nodeA), nodeOf(source.nodeB));
    }

    // A source energises its own island. Anything reachable from a source can
    // carry current; anything else is floating.
    const energised = new Set<number>();
    for (const source of sources) {
      energised.add(islands.find(nodeOf(source.nodeA)));
    }

    const liveResistors = resistors.filter((resistor) =>
      energised.has(islands.find(nodeOf(resistor.nodeA))),
    );

    // The nodes that are actually in the solve. A floating node is not one of
    // them, and must not become an unknown: an unknown that no element
    // stamps is a row of zeros, which is exactly the singularity above.
    const liveNodes = new Set<number>();
    for (const resistor of liveResistors) {
      liveNodes.add(nodeOf(resistor.nodeA));
      liveNodes.add(nodeOf(resistor.nodeB));
    }
    for (const source of sources) {
      liveNodes.add(nodeOf(source.nodeA));
      liveNodes.add(nodeOf(source.nodeB));
    }

    // --- Ground ----------------------------------------------------------
    // The negative terminal of the first source is the reference node.
    const groundTerminal = sources[0]?.nodeB;
    const groundIndex = groundTerminal !== undefined ? nodeOf(groundTerminal) : -1;

    // Map node indices onto the reduced (non-ground) unknown set.
    const reducedIndex = new Map<number, number>();
    for (const index of liveNodes) {
      if (index === groundIndex) continue;
      reducedIndex.set(index, reducedIndex.size);
    }

    // The nodes a source pins to a fixed potential. Anything else is a free
    // node that a divider can tap.
    const railIndices = new Set<number>();
    for (const source of sources) {
      railIndices.add(nodeOf(source.nodeA));
      railIndices.add(nodeOf(source.nodeB));
    }

    const nodeCount = reducedIndex.size;
    const sourceCount = sources.length;
    const total = nodeCount + sourceCount;

    if (total === 0) return results;

    const matrix: number[][] = Array.from({ length: total }, () => new Array<number>(total).fill(0));
    const rhs: number[] = new Array<number>(total).fill(0);

    const stampResistor = (nodeA: number, nodeB: number, resistance: number): void => {
      const conductance = 1 / Math.max(1e-9, resistance);
      const ia = reducedIndex.get(nodeA);
      const ib = reducedIndex.get(nodeB);
      if (ia !== undefined && ib !== undefined) {
        matrix[ia]![ia]! += conductance;
        matrix[ib]![ib]! += conductance;
        matrix[ia]![ib]! -= conductance;
        matrix[ib]![ia]! -= conductance;
      } else if (ia !== undefined) {
        matrix[ia]![ia]! += conductance;
      } else if (ib !== undefined) {
        matrix[ib]![ib]! += conductance;
      }
      // A node that is ground contributes nothing to the reduced system.
    };

    for (const resistor of liveResistors) {
      stampResistor(nodeOf(resistor.nodeA), nodeOf(resistor.nodeB), resistor.resistance);
    }

    // Voltage sources: extra unknown for the branch current.
    sources.forEach((source, index) => {
      const nodeA = nodeOf(source.nodeA);
      const nodeB = nodeOf(source.nodeB);
      const branch = nodeCount + index;
      const ia = reducedIndex.get(nodeA);
      const ib = reducedIndex.get(nodeB);

      if (ia !== undefined) {
        matrix[ia]![branch]! += 1;
        matrix[branch]![ia]! += 1;
      }
      if (ib !== undefined) {
        matrix[ib]![branch]! -= 1;
        matrix[branch]![ib]! -= 1;
      }
      rhs[branch] = source.voltage;
    });

    // --- Solve ------------------------------------------------------------
    const solution = solveLinearSystem(matrix, rhs);

    // A singular system means the circuit has no unique solution (a floating
    // node, or two nodes shorted together). Report zeros rather than
    // inventing values.
    const solved = solution !== null;

    const voltageAt = (node: number): number => {
      if (!solved) return 0;
      if (node === groundIndex) return 0;
      const index = reducedIndex.get(node);
      if (index === undefined) return 0;
      return solution[index] ?? 0;
    };

    // --- Report per component --------------------------------------------
    for (const resistor of liveResistors) {
      const voltage = voltageAt(nodeOf(resistor.nodeA)) - voltageAt(nodeOf(resistor.nodeB));
      const current = voltage / Math.max(1e-9, resistor.resistance);
      results.set(resistor.componentId, {
        voltage: quantity(voltage, 'V'),
        current: quantity(current, 'A'),
        resistance: quantity(resistor.resistance, 'ohm'),
      });
    }

    sources.forEach((source, index) => {
      const branch = nodeCount + index;
      const current = solved ? (solution[branch] ?? 0) : 0;
      // The terminals are published under their own port ids. An ideal source
      // holds its voltage whatever the load, so the positive terminal reads
      // the source voltage even when the rest of the circuit is broken.
      const positive = solved ? voltageAt(nodeOf(source.nodeA)) : source.voltage;
      const negative = solved ? voltageAt(nodeOf(source.nodeB)) : 0;
      results.set(source.componentId, {
        voltage: quantity(source.voltage, 'V'),
        current: quantity(current, 'A'),
        positive: quantity(positive, 'V'),
        negative: quantity(negative, 'V'),
      });
    });

    // The LED is not part of the linear solve — it is an indicator load that
    // reports the voltage across it. Its terminals are looked up, never
    // created: an LED wired to nothing must not add an unknown to the system.
    for (const component of input.components) {
      if (component.type !== 'electronics.led') continue;
      const state = input.states.get(component.id) ?? {};
      const params = state as { __param_forward_voltage?: number };
      const forward = params.__param_forward_voltage ?? 2;

      const ledTerminals = terminalsOf(component.id);
      const nodeA = lookupNode(ledTerminals[0] ?? `${component.id}:anode`);
      const nodeB = lookupNode(ledTerminals[1] ?? `${component.id}:cathode`);
      const voltage =
        (nodeA !== undefined ? voltageAt(nodeA) : 0) -
        (nodeB !== undefined ? voltageAt(nodeB) : 0);
      const conducting = voltage >= forward ? 1 : 0;

      results.set(component.id, {
        voltage: quantity(voltage, 'V'),
        current: quantity(conducting ? voltage / 100 : 0, 'A'),
        conducting: quantity(conducting, 'ratio'),
        forwardVoltage: quantity(forward, 'V'),
      });
    }

    // The sensor reports the divider tap, normalised to the supply.
    //
    // The tap is the sensor's node that is *not* a source rail. In the
    // standard wiring — supply → probe → tap → reference resistor → ground —
    // the probe sits above the tap, so as the medium dries the probe's
    // resistance rises and the tap voltage falls. The comparator therefore
    // thresholds a solved circuit quantity, not the biological value that
    // drove the sensor.
    const supplyVoltage = sources.reduce((max, s) => Math.max(max, s.voltage), 0);

    for (const component of input.components) {
      if (component.type !== 'electronics.sensor') continue;
      const solvedValues = results.get(component.id);
      const sensorTerminals = terminalsOf(component.id);
      const nodeA = lookupNode(sensorTerminals[0] ?? `${component.id}:terminal_a`);
      const nodeB = lookupNode(sensorTerminals[1] ?? `${component.id}:terminal_b`);

      const candidates = [nodeA, nodeB].filter((n): n is number => n !== undefined);
      const offRail = candidates.filter((node) => !railIndices.has(node));
      const pool = offRail.length > 0 ? offRail : candidates;

      // Prefer a node shared with another resistor — that is the divider tap.
      const shared = pool.filter((node) =>
        liveResistors.some(
          (resistor) =>
            resistor.componentId !== component.id &&
            (nodeOf(resistor.nodeA) === node || nodeOf(resistor.nodeB) === node),
        ),
      );

      const tap = (shared.length > 0 ? shared : pool)[0];
      const tapVoltage = tap !== undefined ? voltageAt(tap) : 0;
      const signal =
        supplyVoltage > 0 ? Math.min(1, Math.max(0, tapVoltage / supplyVoltage)) : 0;

      results.set(component.id, {
        ...(solvedValues ?? {}),
        signal: quantity(signal, 'ratio'),
      });
    }

    return results;
  },
};

// ---------------------------------------------------------------------------
// Component definitions
// ---------------------------------------------------------------------------

export const resistorDefinition: ComponentDefinition = {
  type: 'electronics.resistor',
  name: 'Resistor',
  discipline: 'electronics',
  category: 'Passive',
  description:
    'An ideal resistor obeying Ohm\'s law. Current is proportional to the voltage across it.',
  confidence: 'physical-law',
  assumptions: [
    'Resistance is constant and independent of temperature.',
    'No parasitic inductance or capacitance is modelled.',
    'Ideal component: no tolerance and no power rating limit.',
  ],
  ports: [
    {
      id: 'terminal_a',
      label: 'Terminal A',
      direction: 'bidirectional',
      channel: 'electrical-potential',
      unit: 'V',
      required: false,
      description: 'One side of the resistor.',
    },
    {
      id: 'terminal_b',
      label: 'Terminal B',
      direction: 'bidirectional',
      channel: 'electrical-potential',
      unit: 'V',
      required: false,
      description: 'The other side of the resistor.',
    },
  ],
  parameters: [
    {
      id: 'resistance',
      label: 'Resistance',
      kind: 'number',
      unit: 'ohm',
      defaultValue: 1000,
      min: 0.1,
      max: 1e7,
      step: 10,
      description: 'Resistance in ohms. The ratio of voltage to current.',
      confidence: 'physical-law',
    },
    {
      id: 'label',
      label: 'Label',
      kind: 'string',
      defaultValue: 'R1',
      description: 'Reference designator shown in the workbench.',
    },
  ],
  initialState: { outputs: { voltage: quantity(0, 'V'), current: quantity(0, 'A') } },
  visual: { shape: 'cylinder', color: '#c8a15a', label: 'R' },
  readings: [
    {
      id: 'voltage',
      label: 'Voltage',
      unit: 'V',
      description: 'Voltage across the resistor terminals.',
    },
    {
      id: 'current',
      label: 'Current',
      unit: 'A',
      description: 'Current flowing through the resistor.',
    },
    {
      id: 'resistance',
      label: 'Resistance',
      unit: 'ohm',
      description: 'The resistance value.',
    },
  ],
};

export const resistorBehavior: ComponentBehavior = {
  type: 'electronics.resistor',
  step(state, _inputs, context) {
    const s = state as { outputs?: Record<string, Quantity> };
    const outputs = (s.outputs ?? {}) as Record<string, Quantity>;
    const solved = context.network.get(context.componentId);
    const voltage = solved?.['voltage'] ?? outputs.voltage ?? quantity(0, 'V');
    const current = solved?.['current'] ?? outputs.current ?? quantity(0, 'A');
    const resistance = solved?.['resistance'] ?? outputs.resistance ?? quantity(1000, 'ohm');
    return { ...s, outputs: { ...outputs, voltage, current, resistance } };
  },
};

export const voltageSourceDefinition: ComponentDefinition = {
  type: 'electronics.voltage-source',
  name: 'Battery',
  discipline: 'electronics',
  category: 'Source',
  description:
    'An ideal DC voltage source. Supplies a fixed potential difference across its terminals.',
  confidence: 'physical-law',
  assumptions: [
    'Output voltage is held constant regardless of load.',
    'Internal resistance is zero — a real battery would sag under load.',
    'Capacity and discharge behaviour are not modelled.',
  ],
  ports: [
    {
      id: 'positive',
      label: 'Positive terminal',
      direction: 'output',
      channel: 'electrical-potential',
      unit: 'V',
      required: false,
      description: 'The higher-potential terminal.',
    },
    {
      id: 'negative',
      label: 'Negative terminal',
      direction: 'input',
      channel: 'electrical-potential',
      unit: 'V',
      required: false,
      description: 'The lower-potential terminal. The circuit returns here.',
    },
  ],
  parameters: [
    {
      id: 'voltage',
      label: 'Output voltage',
      kind: 'number',
      unit: 'V',
      defaultValue: 5,
      min: 0.1,
      max: 48,
      step: 0.1,
      description: 'The voltage the source maintains between its terminals.',
      confidence: 'physical-law',
    },
    {
      id: 'label',
      label: 'Label',
      kind: 'string',
      defaultValue: 'V1',
      description: 'Reference designator.',
    },
  ],
  initialState: {
    outputs: {
      voltage: quantity(0, 'V'),
      positive: quantity(0, 'V'),
      negative: quantity(0, 'V'),
    },
  },
  visual: { shape: 'box', color: '#e05d5d', label: 'V' },
  readings: [
    {
      id: 'voltage',
      label: 'Voltage',
      unit: 'V',
      description: 'The voltage the source maintains between its terminals.',
    },
    {
      id: 'current',
      label: 'Current',
      unit: 'A',
      description: 'Current flowing from the source into the circuit.',
    },
  ],
};

export const voltageSourceBehavior: ComponentBehavior = {
  type: 'electronics.voltage-source',
  step(state, _inputs, context) {
    const s = state as { outputs?: Record<string, Quantity> };
    const outputs = (s.outputs ?? {}) as Record<string, Quantity>;
    const solved = context.network.get(context.componentId);
    return {
      ...s,
      outputs: {
        ...outputs,
        voltage: solved?.['voltage'] ?? quantity(5, 'V'),
        current: solved?.['current'] ?? quantity(0, 'A'),
        // The two terminals, published under their port ids so a wire can
        // read the battery's potential.
        positive: solved?.['positive'] ?? quantity(5, 'V'),
        negative: solved?.['negative'] ?? quantity(0, 'V'),
      },
    };
  },
};

export const ledDefinition: ComponentDefinition = {
  type: 'electronics.led',
  name: 'LED',
  discipline: 'electronics',
  category: 'Output',
  description:
    'A light-emitting diode. Conducts once the forward voltage exceeds its threshold, and the brightness tracks the current.',
  confidence: 'established-simplified',
  assumptions: [
    'Modelled as an ideal diode with a fixed forward-voltage threshold.',
    'Brightness is proportional to forward current, capped at the rated maximum.',
    'The LED is treated as an indicator load and is not fed back into the circuit solve.',
  ],
  ports: [
    {
      id: 'anode',
      label: 'Anode',
      direction: 'bidirectional',
      channel: 'electrical-potential',
      unit: 'V',
      required: false,
      description: 'The positive side of the diode junction.',
    },
    {
      id: 'cathode',
      label: 'Cathode',
      direction: 'bidirectional',
      channel: 'electrical-potential',
      unit: 'V',
      required: false,
      description: 'The negative side of the diode junction.',
    },
    {
      id: 'trigger',
      label: 'Trigger',
      direction: 'input',
      channel: 'signal',
      unit: 'ratio',
      required: false,
      description: 'Optional digital trigger. When connected, it overrides the voltage threshold.',
    },
  ],
  parameters: [
    {
      id: 'forward_voltage',
      label: 'Forward voltage',
      kind: 'number',
      unit: 'V',
      defaultValue: 2,
      min: 1,
      max: 4,
      step: 0.1,
      description: 'Voltage at which the LED begins to conduct.',
      confidence: 'established-simplified',
    },
    {
      id: 'max_current',
      label: 'Maximum current',
      kind: 'number',
      unit: 'mA',
      defaultValue: 20,
      min: 1,
      max: 100,
      step: 1,
      description: 'Rated current limit. Brightness saturates here.',
      confidence: 'established-simplified',
    },
    {
      id: 'label',
      label: 'Label',
      kind: 'string',
      defaultValue: 'LED1',
      description: 'Reference designator.',
    },
  ],
  initialState: { outputs: { brightness: quantity(0, 'ratio'), conducting: quantity(0, 'ratio') } },
  visual: { shape: 'sphere', color: '#ff8f5e', emissive: '#ff5a2e', label: 'LED' },
  readings: [
    {
      id: 'brightness',
      label: 'Brightness',
      unit: 'ratio',
      description: 'How bright the LED appears, from 0 (off) to 1 (full).',
    },
    {
      id: 'conducting',
      label: 'Conducting',
      unit: 'ratio',
      description: 'Whether the LED is currently conducting, 1 or 0.',
    },
    {
      id: 'voltage',
      label: 'Voltage across the LED',
      unit: 'V',
      description: 'Voltage across the LED terminals.',
    },
    {
      id: 'current',
      label: 'Current',
      unit: 'A',
      description: 'Current flowing through the LED.',
    },
    {
      id: 'forwardVoltage',
      label: 'Forward voltage',
      unit: 'V',
      description: 'The voltage the LED needs before it conducts.',
    },
  ],
};

export const ledBehavior: ComponentBehavior = {
  type: 'electronics.led',
  step(state, inputs, context) {
    const s = state as { outputs?: Record<string, Quantity> };
    const maxCurrent = ((s as { __param_max_current?: number }).__param_max_current ?? 20) / 1000;
    const outputs = (s.outputs ?? {}) as Record<string, Quantity>;
    const solved = context.network.get(context.componentId);

    // A connected trigger takes precedence over the voltage threshold.
    const trigger = inputs.trigger?.value;
    let conducting: number;
    if (trigger !== undefined) {
      conducting = trigger > 0.5 ? 1 : 0;
    } else {
      conducting = (solved?.['conducting']?.value ?? 0) > 0 ? 1 : 0;
    }

    const voltage = solved?.['voltage'] ?? outputs.voltage ?? quantity(0, 'V');
    const current = conducting ? quantity(Math.min(maxCurrent, voltage.value / 100 || maxCurrent), 'A') : quantity(0, 'A');
    const brightness = conducting
      ? quantity(Math.min(1, current.value / maxCurrent || 1), 'ratio')
      : quantity(0, 'ratio');
    // The forward voltage is a property of the LED, not a reading of the
    // circuit. It has to be published on every step, not just at the start,
    // or the measurement appears on the panel and then vanishes when the
    // run begins.
    const forwardVoltage =
      solved?.['forwardVoltage'] ??
      outputs.forwardVoltage ??
      quantity((s as { __param_forward_voltage?: number }).__param_forward_voltage ?? 2, 'V');

    return {
      ...s,
      outputs: {
        ...outputs,
        voltage,
        current,
        brightness,
        conducting: quantity(conducting, 'ratio'),
        forwardVoltage,
      },
    };
  },
};

export const switchDefinition: ComponentDefinition = {
  type: 'electronics.switch',
  name: 'Switch',
  discipline: 'electronics',
  category: 'Passive',
  description: 'A two-state switch. Closed passes current; open breaks the circuit.',
  confidence: 'physical-law',
  assumptions: ['Ideal switch: near-zero resistance when closed, effectively open when off.'],
  ports: [
    {
      id: 'terminal_a',
      label: 'Terminal A',
      direction: 'bidirectional',
      channel: 'electrical-potential',
      unit: 'V',
      required: false,
      description: 'One contact.',
    },
    {
      id: 'terminal_b',
      label: 'Terminal B',
      direction: 'bidirectional',
      channel: 'electrical-potential',
      unit: 'V',
      required: false,
      description: 'The other contact.',
    },
  ],
  parameters: [
    {
      id: 'closed',
      label: 'Closed',
      kind: 'boolean',
      defaultValue: true,
      description: 'Whether the switch is closed and conducting.',
    },
    {
      id: 'label',
      label: 'Label',
      kind: 'string',
      defaultValue: 'SW1',
      description: 'Reference designator.',
    },
  ],
  initialState: { outputs: { current: quantity(0, 'A'), closed: quantity(1, 'ratio') } },
  visual: { shape: 'box', color: '#8a94a6', label: 'SW' },
  readings: [
    {
      id: 'voltage',
      label: 'Voltage',
      unit: 'V',
      description: 'Voltage across the switch terminals.',
    },
    {
      id: 'current',
      label: 'Current',
      unit: 'A',
      description: 'Current flowing through the switch.',
    },
    {
      id: 'closed',
      label: 'Closed',
      unit: 'ratio',
      description: 'Whether the switch is closed, 1 or 0.',
    },
  ],
};

export const switchBehavior: ComponentBehavior = {
  type: 'electronics.switch',
  step(state, _inputs, context) {
    const s = state as { outputs?: Record<string, Quantity> };
    const closed = (s as { __param_closed?: boolean }).__param_closed ?? true;
    const outputs = (s.outputs ?? {}) as Record<string, Quantity>;
    const solved = context.network.get(context.componentId);
    return {
      ...s,
      outputs: {
        ...outputs,
        voltage: solved?.['voltage'] ?? quantity(0, 'V'),
        current: solved?.['current'] ?? quantity(0, 'A'),
        closed: quantity(closed ? 1 : 0, 'ratio'),
      },
    };
  },
};

/**
 * A resistive sensor whose resistance depends on an external biological or
 * environmental quantity. This is the bridge component that makes the
 * interdisciplinary coupling concrete.
 */
export const sensorDefinition: ComponentDefinition = {
  type: 'electronics.sensor',
  name: 'Resistive sensor',
  discipline: 'electronics',
  category: 'Sensor',
  description:
    'A sensor whose resistance varies with an input quantity. Used to convert a biological or material state into an electrical signal.',
  confidence: 'established-simplified',
  assumptions: [
    'Resistance varies linearly between the two calibration endpoints.',
    'Response is instantaneous — sensor lag is not modelled.',
    'Excitation is supplied externally; the sensor does not generate its own signal.',
  ],
  ports: [
    {
      id: 'sense',
      label: 'Sense input',
      direction: 'input',
      channel: 'signal',
      unit: 'ratio',
      required: true,
      description: 'The physical quantity being measured, normalised to 0–1.',
    },
    {
      id: 'terminal_a',
      label: 'Terminal A',
      direction: 'bidirectional',
      channel: 'electrical-potential',
      unit: 'V',
      required: false,
      description: 'Electrical terminal.',
    },
    {
      id: 'terminal_b',
      label: 'Terminal B',
      direction: 'bidirectional',
      channel: 'electrical-potential',
      unit: 'V',
      required: false,
      description: 'Electrical terminal.',
    },
    {
      id: 'signal',
      label: 'Measured signal',
      direction: 'output',
      channel: 'signal',
      unit: 'ratio',
      required: false,
      description: 'The normalised quantity being measured, from 0 to 1.',
    },
  ],
  parameters: [
    {
      id: 'resistance_at_zero',
      label: 'Resistance at 0%',
      kind: 'number',
      unit: 'kohm',
      defaultValue: 10,
      min: 0.01,
      max: 1000,
      step: 0.1,
      description: 'Sensor resistance when the sensed quantity is at its minimum.',
      confidence: 'established-simplified',
    },
    {
      id: 'resistance_at_full',
      label: 'Resistance at 100%',
      kind: 'number',
      unit: 'kohm',
      defaultValue: 1,
      min: 0.01,
      max: 1000,
      step: 0.1,
      description: 'Sensor resistance when the sensed quantity is at its maximum.',
      confidence: 'established-simplified',
    },
    {
      id: 'label',
      label: 'Label',
      kind: 'string',
      defaultValue: 'S1',
      description: 'Reference designator.',
    },
  ],
  initialState: { outputs: { resistance: quantity(10_000, 'ohm'), current: quantity(0, 'A') } },
  visual: { shape: 'cylinder', color: '#4fc3f7', label: 'S' },
  readings: [
    {
      id: 'resistance',
      label: 'Resistance',
      unit: 'ohm',
      description: 'The sensor resistance, which varies with the sensed quantity.',
    },
    {
      id: 'current',
      label: 'Current',
      unit: 'A',
      description: 'Current flowing through the sensor.',
    },
    {
      id: 'voltage',
      label: 'Voltage',
      unit: 'V',
      description: 'Voltage drop across the sensor terminals.',
    },
  ],
};

export const sensorBehavior: ComponentBehavior = {
  type: 'electronics.sensor',
  step(state, inputs, context) {
    const s = state as { outputs?: Record<string, Quantity> };
    const outputs = (s.outputs ?? {}) as Record<string, Quantity>;
    const solved = context.network.get(context.componentId);

    const sense = inputs.sense ?? quantity(0, 'ratio');
    const clamped = Math.min(1, Math.max(0, sense.value));

    return {
      ...s,
      outputs: {
        ...outputs,
        voltage: solved?.['voltage'] ?? quantity(0, 'V'),
        current: solved?.['current'] ?? quantity(0, 'A'),
        resistance: solved?.['resistance'] ?? quantity(10_000, 'ohm'),
        sense: quantity(clamped, 'ratio'),
        // The normalised divider voltage across this sensor, as solved by the
        // nodal analysis. This is what the comparator thresholds.
        signal: solved?.['signal'] ?? quantity(clamped, 'ratio'),
      },
    };
  },
};

/**
 * A comparator: reads a signal on one input and produces a binary decision on
 * the other. This is the component that turns a biological state into a
 * switchable electronic response.
 */
export const comparatorDefinition: ComponentDefinition = {
  type: 'electronics.comparator',
  name: 'Threshold comparator',
  discipline: 'electronics',
  category: 'Logic',
  description:
    'Compares an input signal against a threshold and produces a binary decision.',
  confidence: 'physical-law',
  assumptions: [
    'Ideal comparator: no input current and no propagation delay.',
    'Output is binary (0 or 1).',
  ],
  ports: [
    {
      id: 'input',
      label: 'Signal input',
      direction: 'input',
      channel: 'signal',
      unit: 'ratio',
      required: true,
      description: 'The signal being compared.',
    },
    {
      id: 'output',
      label: 'Decision output',
      direction: 'output',
      channel: 'signal',
      unit: 'ratio',
      required: false,
      description: '1 when the signal exceeds the threshold, otherwise 0.',
    },
  ],
  parameters: [
    {
      id: 'threshold',
      label: 'Threshold',
      kind: 'number',
      unit: 'ratio',
      defaultValue: 0.5,
      min: 0,
      max: 1,
      step: 0.01,
      description: 'The signal level at which the output switches.',
      confidence: 'physical-law',
    },
    {
      id: 'invert',
      label: 'Invert',
      kind: 'boolean',
      defaultValue: false,
      description: 'When true the output is high while the signal is below the threshold.',
    },
    {
      id: 'label',
      label: 'Label',
      kind: 'string',
      defaultValue: 'U1',
      description: 'Reference designator.',
    },
  ],
  initialState: { outputs: { decision: quantity(0, 'ratio') } },
  visual: { shape: 'box', color: '#ba68c8', label: 'U' },
  readings: [
    {
      id: 'decision',
      label: 'Decision',
      unit: 'ratio',
      description: 'The binary decision: 1 when the condition is met, 0 otherwise.',
    },
  ],
};

export const comparatorBehavior: ComponentBehavior = {
  type: 'electronics.comparator',
  step(state, inputs, _context) {
    const s = state as { outputs?: Record<string, Quantity>; __prev_decision?: number };
    const threshold = (s as { __param_threshold?: number }).__param_threshold ?? 0.5;
    const invert = (s as { __param_invert?: boolean }).__param_invert ?? false;
    const outputs = (s.outputs ?? {}) as Record<string, Quantity>;

    const input = inputs.input;

    // A comparator with nothing on its input has no decision to make. It
    // must not fall back to comparing zero against the threshold, because an
    // inverted comparator would then report an alarm for a circuit that is
    // simply not connected.
    if (!input) {
      return {
        ...s,
        outputs: {
          ...outputs,
          output: quantity(0, 'ratio'),
          decision: quantity(0, 'ratio'),
        },
        __prev_decision: s.__prev_decision,
      };
    }

    const high = invert ? input.value < threshold : input.value > threshold;
    const decision = high ? 1 : 0;
    return {
      ...s,
      outputs: {
        ...outputs,
        // Published under the port id so a connection can read it, and under a
        // readable alias so the measurements panel can name it.
        output: quantity(decision, 'ratio'),
        decision: quantity(decision, 'ratio'),
      },
      // Track previous decision for transition detection in observe.
      __prev_decision: outputs.decision?.value ?? (invert ? 1 : 0),
    };
  },

  observe(state, context) {
    const s = state as { outputs?: Record<string, Quantity>; __prev_decision?: number };
    const outputs = (s.outputs ?? {}) as Record<string, Quantity>;
    const currentDecision = outputs.decision?.value ?? 0;
    const previousDecision = s.__prev_decision;
    const observations: Observation[] = [];

    // Alert fired: decision went from 0 to 1.
    if (previousDecision !== undefined && previousDecision <= 0 && currentDecision > 0) {
      observations.push({
        time: context.time,
        componentId: context.componentId,
        severity: 'error',
        code: 'electronics.alert_fired',
        message: 'The alert has fired.',
      });
    }

    // Alert cleared: decision went from 1 to 0.
    if (previousDecision !== undefined && previousDecision > 0 && currentDecision <= 0) {
      observations.push({
        time: context.time,
        componentId: context.componentId,
        severity: 'info',
        code: 'electronics.alert_cleared',
        message: 'The alert has cleared.',
      });
    }

    return observations;
  },
};

export const electronicsRules: readonly ConnectionRule[] = [
  {
    sourceChannel: 'electrical-potential',
    targetChannel: 'electrical-potential',
    transfer: { kind: 'identity' },
    sourceDiscipline: '*',
    targetDiscipline: '*',
    description: 'Electrical potential passes through unchanged.',
    confidence: 'physical-law',
  },
  {
    sourceChannel: 'electrical-current',
    targetChannel: 'electrical-current',
    transfer: { kind: 'identity' },
    sourceDiscipline: '*',
    targetDiscipline: '*',
    description: 'Electrical current passes through unchanged.',
    confidence: 'physical-law',
  },
  {
    sourceChannel: 'electrical-resistance',
    targetChannel: 'electrical-resistance',
    transfer: { kind: 'identity' },
    sourceDiscipline: '*',
    targetDiscipline: '*',
    description: 'Resistance passes through unchanged.',
    confidence: 'physical-law',
  },
  {
    sourceChannel: 'signal',
    targetChannel: 'signal',
    transfer: { kind: 'identity' },
    sourceDiscipline: '*',
    targetDiscipline: '*',
    description: 'A normalised signal passes through unchanged.',
    confidence: 'physical-law',
  },
];

export const electronicsEngine: DisciplineEngine = {
  id: 'electronics',
  name: 'Electronics',
  version: '1.0.0',
  components: [
    resistorDefinition,
    voltageSourceDefinition,
    ledDefinition,
    switchDefinition,
    sensorDefinition,
    comparatorDefinition,
  ],
  behaviors: new Map([
    ['electronics.resistor', resistorBehavior],
    ['electronics.voltage-source', voltageSourceBehavior],
    ['electronics.led', ledBehavior],
    ['electronics.switch', switchBehavior],
    ['electronics.sensor', sensorBehavior],
    ['electronics.comparator', comparatorBehavior],
  ]),
  connectionRules: electronicsRules,
  networkSolver: electronicsNetworkSolver,
};

/** Read a numeric parameter from a component instance's parameter map. */
export function paramValue(
  parameters: Readonly<Record<string, ParameterValue>>,
  id: string,
  fallback: number,
): number {
  const value = parameters[id]?.value;
  return typeof value === 'number' ? value : fallback;
}
