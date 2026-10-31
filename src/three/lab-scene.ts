/**
 * FrankenLab — the 3D laboratory scene.
 *
 * Three.js draws the experiment. It reads the simulation's real outputs and
 * animates from them, so what you see on the bench is what the kernel
 * computed. The scene never invents a value.
 *
 * The scene owns no simulation state and no React state. It is handed an
 * experiment and a set of readings, and it draws them.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  CSS2DObject,
  CSS2DRenderer,
} from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { ComponentRegistry } from '@/kernel/registry';
import type { ComponentDefinition, ExperimentDefinition, Quantity } from '@/kernel/types';
import { DISCIPLINE_COLOURS } from '@/world';

/** How a component's shape is turned into geometry. */
function geometryFor(shape: ComponentDefinition['visual']['shape']): THREE.BufferGeometry {
  switch (shape) {
    case 'box':
      return new THREE.BoxGeometry(0.8, 0.8, 0.8);
    case 'cylinder':
      return new THREE.CylinderGeometry(0.34, 0.34, 0.9, 24);
    case 'sphere':
      return new THREE.SphereGeometry(0.44, 28, 18);
    case 'torus':
      return new THREE.TorusGeometry(0.42, 0.13, 16, 36);
    case 'plate':
      return new THREE.CylinderGeometry(0.72, 0.82, 0.34, 36);
    case 'organic':
      return new THREE.SphereGeometry(0.4, 24, 16);
    case 'custom':
    default:
      return new THREE.SphereGeometry(0.42, 24, 16);
  }
}

/** A living thing is a stem with leaves, not a sphere. */
function buildPlant(): THREE.Group {
  const group = new THREE.Group();

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.08, 1, 12),
    new THREE.MeshStandardMaterial({ color: 0x4f8f3c, roughness: 0.85 }),
  );
  stem.position.y = 0.5;
  group.add(stem);

  const leafMaterial = new THREE.MeshStandardMaterial({
    color: 0x7bc96f,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });

  for (let i = 0; i < 4; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 12), leafMaterial);
    const angle = (i / 4) * Math.PI * 2;
    leaf.scale.set(1.5, 0.28, 0.9);
    leaf.position.set(Math.cos(angle) * 0.26, 0.45 + i * 0.16, Math.sin(angle) * 0.26);
    leaf.rotation.z = Math.cos(angle) * 0.5;
    leaf.rotation.y = -angle;
    group.add(leaf);
  }

  return group;
}

interface ComponentNode {
  readonly group: THREE.Group;
  readonly id: string;
  readonly type: string;
  readonly discipline: string;
  readonly emissiveMaterials: THREE.MeshStandardMaterial[];
  readonly baseColor: THREE.Color;
  readonly glow: THREE.Mesh;
  readonly plant: THREE.Group | null;
}

export interface LabSceneOptions {
  readonly container: HTMLElement;
  readonly onSelect: (componentId: string | null) => void;
}

export class LabScene {
  readonly #container: HTMLElement;
  readonly #onSelect: (componentId: string | null) => void;

  readonly #renderer: THREE.WebGLRenderer;
  readonly #labelRenderer: CSS2DRenderer;
  readonly #scene: THREE.Scene;
  readonly #camera: THREE.PerspectiveCamera;
  readonly #controls: OrbitControls;
  readonly #raycaster = new THREE.Raycaster();

  readonly #nodes = new Map<string, ComponentNode>();
  readonly #pickables: THREE.Object3D[] = [];
  #connections: THREE.Line[] = [];
  #selectionRing: THREE.Mesh | null = null;
  #disposed = false;

  constructor(options: LabSceneOptions) {
    this.#container = options.container;
    this.#onSelect = options.onSelect;

    const width = options.container.clientWidth || 960;
    const height = options.container.clientHeight || 600;

    this.#scene = new THREE.Scene();
    this.#scene.background = new THREE.Color(0x05070d);
    this.#scene.fog = new THREE.Fog(0x05070d, 14, 34);

    this.#camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    this.#camera.position.set(8.5, 6, 12.5);

    this.#renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.#renderer.setSize(width, height);
    this.#renderer.shadowMap.enabled = false;
    // The canvas and the label layer must share an origin, otherwise the
    // labels drift away from the parts they name.
    this.#renderer.domElement.style.position = 'absolute';
    this.#renderer.domElement.style.top = '0';
    this.#renderer.domElement.style.left = '0';
    this.#renderer.domElement.style.display = 'block';
    this.#container.appendChild(this.#renderer.domElement);

    this.#labelRenderer = new CSS2DRenderer();
    this.#labelRenderer.setSize(width, height);
    this.#labelRenderer.domElement.style.position = 'absolute';
    this.#labelRenderer.domElement.style.top = '0';
    this.#labelRenderer.domElement.style.left = '0';
    this.#labelRenderer.domElement.style.pointerEvents = 'none';
    this.#container.appendChild(this.#labelRenderer.domElement);

    this.#controls = new OrbitControls(this.#camera, this.#renderer.domElement);
    this.#controls.enableDamping = true;
    this.#controls.dampingFactor = 0.08;
    this.#controls.target.set(0.5, 0.1, 0);
    this.#controls.minDistance = 4;
    this.#controls.maxDistance = 28;
    this.#controls.maxPolarAngle = Math.PI * 0.52;

    this.#buildEnvironment();
    this.#bindPointer();
  }

  /** The bench, the lights and the floor grid. */
  #buildEnvironment(): void {
    const hemi = new THREE.HemisphereLight(0x9fc4ff, 0x0a0d16, 0.55);
    this.#scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(6, 9, 5);
    this.#scene.add(key);

    const rim = new THREE.DirectionalLight(0x4fd1c5, 0.75);
    rim.position.set(-7, 4, -6);
    this.#scene.add(rim);

    const bench = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x0a0f1a, roughness: 0.95, metalness: 0.05 }),
    );
    bench.rotation.x = -Math.PI / 2;
    bench.position.y = -0.6;
    this.#scene.add(bench);

    const grid = new THREE.GridHelper(40, 40, 0x1e2942, 0x141c2e);
    grid.position.y = -0.59;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.55;
    this.#scene.add(grid);
  }

  #bindPointer(): void {
    const dom = this.#renderer.domElement;
    const onPointerDown = (event: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      this.#raycaster.setFromCamera(pointer, this.#camera);
      const hits = this.#raycaster.intersectObjects(this.#pickables, true);

      if (hits.length === 0) {
        this.#onSelect(null);
        return;
      }

      let object: THREE.Object3D | null = hits[0]!.object;
      while (object) {
        const node = [...this.#nodes.values()].find((n) => n.group === object);
        if (node) {
          this.#onSelect(node.id);
          return;
        }
        object = object.parent;
      }
      this.#onSelect(null);
    };

    dom.addEventListener('pointerdown', onPointerDown);
  }

  /** Rebuild the scene for an experiment. */
  setExperiment(experiment: ExperimentDefinition, registry: ComponentRegistry): void {
    for (const node of this.#nodes.values()) {
      this.#scene.remove(node.group);
    }
    this.#nodes.clear();
    this.#pickables.length = 0;

    for (const line of this.#connections) {
      this.#scene.remove(line);
    }
    this.#connections = [];

    for (const instance of experiment.components) {
      const definition = registry.tryGetDefinition(instance.type);
      if (!definition) continue;

      const group = new THREE.Group();
      const position = instance.position ?? { x: 0, y: 0, z: 0 };
      group.position.set(position.x, position.y, position.z);

      const colour = new THREE.Color(definition.visual.color);
      const material = new THREE.MeshStandardMaterial({
        color: colour,
        roughness: 0.55,
        metalness: 0.15,
        emissive: new THREE.Color(definition.visual.emissive ?? '#000000'),
        emissiveIntensity: 0,
      });

      const emissiveMaterials: THREE.MeshStandardMaterial[] = [];

      let plant: THREE.Group | null = null;
      if (definition.visual.shape === 'organic') {
        plant = buildPlant();
        group.add(plant);
      } else {
        const mesh = new THREE.Mesh(geometryFor(definition.visual.shape), material);
        mesh.castShadow = false;
        group.add(mesh);
        emissiveMaterials.push(material);
        this.#pickables.push(mesh);
      }

      // A soft glow shell, used for the LED and for the selection ring.
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 20, 14),
        new THREE.MeshBasicMaterial({
          color: definition.visual.emissive ?? definition.visual.color,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      group.add(glow);

      const label = new CSS2DObject(document.createElement('div'));
      const labelElement = label.element;
      labelElement.className = 'lab-scene-label';
      labelElement.style.cssText = [
        'position: absolute',
        'left: 0',
        'top: 0',
        // CSS2DRenderer resets `display` every frame, so the width has to be
        // pinned rather than relying on inline-block.
        'width: max-content',
        'max-width: 220px',
        'font: 500 11px/1.2 ui-sans-serif, system-ui, sans-serif',
        'letter-spacing: 0.04em',
        'color: #c8d4e8',
        'background: rgba(8, 12, 20, 0.72)',
        'border: 1px solid rgba(44, 58, 92, 0.9)',
        'border-radius: 999px',
        'padding: 3px 9px',
        'white-space: nowrap',
        'pointer-events: none',
      ].join(';');
      labelElement.textContent = instance.label ?? definition.name;
      label.position.set(0, 0.85, 0);
      group.add(label);

      this.#scene.add(group);
      this.#nodes.set(instance.id, {
        group,
        id: instance.id,
        type: instance.type,
        discipline: definition.discipline,
        emissiveMaterials,
        baseColor: colour,
        glow,
        plant,
      });
    }

    // Connections are drawn as arcs between component centres.
    for (const connection of experiment.connections) {
      const source = this.#nodes.get(connection.source.componentId);
      const target = this.#nodes.get(connection.target.componentId);
      if (!source || !target) continue;

      const from = source.group.position.clone();
      const to = target.group.position.clone();
      const midpoint = from.clone().add(to).multiplyScalar(0.5);
      midpoint.y += 0.8 + from.distanceTo(to) * 0.12;

      const curve = new THREE.QuadraticBezierCurve3(from, midpoint, to);
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(48));
      const colour = DISCIPLINE_COLOURS[source.discipline] ?? '#4fd1c5';
      const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 0.55 }),
      );
      this.#scene.add(line);
      this.#connections.push(line);
    }

    if (this.#selectionRing) {
      this.#scene.remove(this.#selectionRing);
      this.#selectionRing = null;
    }
  }

  /** Show the selection ring on a component. */
  setSelection(id: string | null): void {
    if (this.#selectionRing) {
      this.#scene.remove(this.#selectionRing);
      this.#selectionRing = null;
    }
    if (!id) return;

    const node = this.#nodes.get(id);
    if (!node) return;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.78, 0.035, 12, 48),
      new THREE.MeshBasicMaterial({ color: 0x4fd1c5, transparent: true, opacity: 0.95 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(node.group.position);
    ring.position.y -= 0.45;
    this.#scene.add(ring);
    this.#selectionRing = ring;
  }

  /**
   * Animate from the simulation's real readings.
   *
   * Every value here comes from the kernel. Nothing is randomised and nothing
   * is invented.
   */
  applyReadings(readings: Readonly<Record<string, Quantity>>): void {
    const biomass = readings['plant.biomass']?.value ?? 0;
    const moisture = readings['substrate.moisture']?.value ?? 1;
    const signal = readings['sensor.signal']?.value ?? 0;
    const brightness = readings['alert.brightness']?.value ?? 0;
    const decision = readings['comparator.decision']?.value ?? 0;

    for (const node of this.#nodes.values()) {
      switch (node.type) {
        case 'biology.plant': {
          if (node.plant) {
            const growth = 0.35 + biomass * 1.5;
            node.plant.scale.set(0.7 + biomass * 0.7, growth, 0.7 + biomass * 0.7);
          }
          break;
        }
        case 'materials.substrate': {
          // A wet medium is dark and glossy; a dry one is pale and matte.
          const wet = new THREE.Color(0x3b2f28);
          const dry = new THREE.Color(0x9c8a76);
          const colour = wet.clone().lerp(dry, 1 - moisture);
          for (const material of node.emissiveMaterials) material.color.copy(colour);
          break;
        }
        case 'electronics.led': {
          const glow = brightness * 0.75;
          for (const material of node.emissiveMaterials) material.emissiveIntensity = glow * 2;
          (node.glow.material as THREE.MeshBasicMaterial).opacity = glow;
          node.glow.scale.setScalar(1 + brightness * 0.4);
          break;
        }
        case 'electronics.sensor': {
          for (const material of node.emissiveMaterials) {
            material.emissiveIntensity = signal * 0.9;
          }
          (node.glow.material as THREE.MeshBasicMaterial).opacity = signal * 0.3;
          break;
        }
        case 'electronics.comparator': {
          for (const material of node.emissiveMaterials) {
            material.emissiveIntensity = decision * 1.6;
            material.emissive.set(decision > 0.5 ? 0xff8f5e : 0x1b2740);
          }
          break;
        }
        default:
          break;
      }
    }
  }

  render(): void {
    if (this.#disposed) return;
    this.#controls.update();
    this.#renderer.render(this.#scene, this.#camera);
    this.#labelRenderer.render(this.#scene, this.#camera);
  }

  resize(): void {
    const width = this.#container.clientWidth;
    const height = this.#container.clientHeight;
    if (width === 0 || height === 0) return;

    this.#camera.aspect = width / height;
    this.#camera.updateProjectionMatrix();
    this.#renderer.setSize(width, height);
    this.#labelRenderer.setSize(width, height);
  }

  dispose(): void {
    this.#disposed = true;
    this.#controls.dispose();
    this.#renderer.dispose();
    this.#renderer.domElement.remove();
    this.#labelRenderer.domElement.remove();
  }
}
