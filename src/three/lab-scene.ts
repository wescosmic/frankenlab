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
import type {
  ComponentDefinition,
  ExperimentDefinition,
  PortDefinition,
  PortDirection,
  PortRef,
  Quantity,
} from '@/kernel/types';
import { DISCIPLINE_COLOURS } from '@/world';
import { DRAG_TYPE } from '@/drag';

/**
 * How far above a part its name floats, unless the part says otherwise.
 */
const DEFAULT_LABEL_HEIGHT = 0.85;

/**
 * The direction the camera looks from, as a unit vector from the bench towards
 * the viewer.
 *
 * It is raised well above the horizontal so the parts on the bench separate
 * from each other in screen space, and it is turned only slightly off the
 * bench's own axis. A bench laid out along a line and viewed at an angle
 * projects to a diagonal band, and a diagonal band wastes most of the frame.
 */
const VIEW_DIRECTION = new THREE.Vector3(0.16, 0.5, 0.85).normalize();

/**
 * How much room to leave around the bench, as a multiplier on the fitted
 * distance. A little air around the subject reads better than filling every
 * pixel of it.
 */
const FRAME_MARGIN = 1.12;

/**
 * How big a label is, relative to a desktop-sized canvas.
 *
 * The labels are DOM elements, so they do not shrink with the scene the way
 * the parts do. On a phone the canvas is a third of the width it is on a
 * desktop, and labels set in desktop pixels cover the parts they are naming.
 * The font and the padding are scaled together, so a label keeps its shape.
 */
function labelScaleFor(width: number): number {
  return Math.max(0.66, Math.min(1, width / 900));
}

/** The room a part needs around its body, in world units. */
const PART_PADDING = { side: 0.6, below: 0.6, z: 0.6 };

/**
 * The marker that shows where a port is, and the colour it takes.
 */
const PORT_MARKER_RADIUS = 0.1;
const PORT_COLOURS: Record<PortDirection, number> = {
  output: 0x4fd1c5,
  input: 0xffb35c,
  bidirectional: 0x9aa8c0,
};

/**
 * How a component's shape is turned into geometry.
 */
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

/**
 * How far from the middle of a part its port markers sit.
 *
 * The marker has to clear the body, and the bodies are different sizes, so
 * the offset comes from the shape rather than being a single number.
 */
function portSpan(shape: ComponentDefinition['visual']['shape']): number {
  switch (shape) {
    case 'box':
      return 0.5;
    case 'cylinder':
      return 0.5;
    case 'sphere':
      return 0.58;
    case 'torus':
      return 0.62;
    case 'plate':
      return 0.88;
    case 'organic':
      return 0.52;
    case 'custom':
    default:
      return 0.56;
  }
}

/**
 * Where each port marker sits, derived from the port's direction.
 *
 * Outputs go to the right of the part, inputs to the left, and a port that
 * can do either goes in front so it never hides behind another marker. The
 * markers of one direction are stacked so they never overlap.
 *
 * Nothing here is per component type. A part nobody has seen before still
 * gets its ports in sensible places, because the rule only knows about the
 * direction.
 */
function portLayout(
  ports: readonly PortDefinition[],
  span: number,
): Map<string, { x: number; y: number; z: number }> {
  const groups: Record<PortDirection, PortDefinition[]> = {
    output: [],
    input: [],
    bidirectional: [],
  };

  for (const port of ports) {
    groups[port.direction].push(port);
  }

  const layout = new Map<string, { x: number; y: number; z: number }>();
  const place = (list: readonly PortDefinition[], x: number, z: number) => {
    list.forEach((port, index) => {
      layout.set(port.id, {
        x,
        y: (index - (list.length - 1) / 2) * 0.32,
        z,
      });
    });
  };

  place(groups.output, span, 0);
  place(groups.input, -span, 0);
  place(groups.bidirectional, 0, span * 0.95);

  return layout;
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

/**
 * The reading each kind of part animates from.
 *
 * The key is the port or diagnostic the value is published under. It is keyed
 * by component *type*, not by id, so an experiment the user built animates
 * from its own readings exactly like the shipped one.
 */
const VISUAL_SOURCES: Readonly<Record<string, string>> = {
  'biology.plant': 'biomass',
  'materials.substrate': 'moisture',
  'electronics.sensor': 'signal',
  'electronics.comparator': 'decision',
  'electronics.led': 'brightness',
  'chemistry.reaction-vessel': 'product',
};

interface ComponentNode {
  readonly group: THREE.Group;
  readonly id: string;
  readonly type: string;
  readonly discipline: string;
  readonly emissiveMaterials: THREE.MeshStandardMaterial[];
  readonly baseColor: THREE.Color;
  readonly glow: THREE.Mesh;
  readonly plant: THREE.Group | null;
  /**
   * The name floating above the part.
   *
   * The CSS2D renderer puts this element in its own DOM, and it only takes it
   * away again if the object it belongs to is removed from the *scene*. The
   * label belongs to the part's group, not to the scene, so taking the group
   * off the scene leaves the name behind. It has to be removed by hand.
   */
  readonly labelElement: HTMLElement;
}

interface PortHit {
  readonly componentId: string;
  readonly portId: string;
  readonly direction: PortDirection;
}

export interface LabSceneOptions {
  readonly container: HTMLElement;
  readonly onSelect: (componentId: string | null) => void;
  /** The user finished dragging a wire between two ports. */
  readonly onConnect: (source: PortRef, target: PortRef) => void;
  /** The user dropped a part from the catalogue onto the bench. */
  readonly onDropComponent: (type: string, position: { x: number; y: number; z: number }) => void;
  readonly onSelectConnection: (connectionId: string | null) => void;
}

export class LabScene {
  readonly #container: HTMLElement;
  readonly #onSelect: (componentId: string | null) => void;
  readonly #onConnect: (source: PortRef, target: PortRef) => void;
  readonly #onDropComponent: (type: string, position: { x: number; y: number; z: number }) => void;
  readonly #onSelectConnection: (connectionId: string | null) => void;

  readonly #renderer: THREE.WebGLRenderer;
  readonly #labelRenderer: CSS2DRenderer;
  readonly #scene: THREE.Scene;
  readonly #camera: THREE.PerspectiveCamera;
  readonly #controls: OrbitControls;
  readonly #raycaster = new THREE.Raycaster();

  readonly #nodes = new Map<string, ComponentNode>();
  readonly #pickables: THREE.Object3D[] = [];
  /** The port markers, so a drag can find the port under the cursor. */
  readonly #portPickables: THREE.Mesh[] = [];
  /** The wires, so a click can find the wire under the cursor. */
  readonly #wirePickables: THREE.Mesh[] = [];
  /** Which part each wire starts from, so it can be coloured by discipline. */
  readonly #connectionOwners = new Map<string, string>();
  #connections: THREE.Mesh[] = [];
  /** Where the parts of the current experiment sit, so the bench can be framed again. */
  #benchParts: readonly {
    position: { x: number; y: number; z: number };
    labelHeight: number;
  }[] = [];
  #selectionRing: THREE.Mesh | null = null;
  #selectedConnectionId: string | null = null;
  /** How big the labels are, relative to a desktop-sized canvas. */
  #labelScale = 1;

  /** The wire the user is dragging, if any. */
  #wiring: { ref: PortRef; direction: PortDirection } | null = null;
  #wirePreview: THREE.Mesh | null = null;
  #dropGhost: THREE.Mesh | null = null;
  /** True while the pointer is held, so the orbit controls stay off until it is let go. */
  #pointerHeld = false;

  #disposed = false;

  constructor(options: LabSceneOptions) {
    this.#container = options.container;
    this.#onSelect = options.onSelect;
    this.#onConnect = options.onConnect;
    this.#onDropComponent = options.onDropComponent;
    this.#onSelectConnection = options.onSelectConnection;

    const width = options.container.clientWidth || 960;
    const height = options.container.clientHeight || 600;

    this.#labelScale = labelScaleFor(width);

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

  /**
   * Frame the experiment so the bench fills the viewport.
   *
   * The distance is not guessed. Every corner of the bench's bounding box is
   * projected into the camera's frustum, and the camera is placed at the
   * distance that keeps all eight of them inside it. That means the bench
   * fills the frame at any window shape, and it fills it the same way every
   * time.
   *
   * The direction is fixed, so the bench always opens the same way, and the
   * orbit controls still work from there.
   */
  #frameExperiment(
    parts: readonly { position: { x: number; y: number; z: number }; labelHeight: number }[],
  ): void {
    if (parts.length === 0) return;

    // The box has to hold the parts *and* the names floating above them, so
    // it is built from where each name actually ends up.
    const box = new THREE.Box3();
    for (const part of parts) {
      const { x, y, z } = part.position;
      box.expandByPoint(new THREE.Vector3(x - PART_PADDING.side, y - PART_PADDING.below, z - PART_PADDING.z));
      box.expandByPoint(new THREE.Vector3(x + PART_PADDING.side, y + part.labelHeight + 0.3, z + PART_PADDING.z));
    }

    const centre = box.getCenter(new THREE.Vector3());

    // Place the camera at a trial distance, then read its axes. The camera's
    // local +Z points back towards the viewer, so the view direction is -Z.
    const probe = new THREE.Vector3().copy(centre).addScaledVector(VIEW_DIRECTION, 10);
    this.#camera.position.copy(probe);
    this.#camera.lookAt(centre);
    this.#camera.updateMatrixWorld();

    const basis = this.#camera.matrixWorld.elements;
    const right = new THREE.Vector3(basis[0]!, basis[1]!, basis[2]!);
    const up = new THREE.Vector3(basis[4]!, basis[5]!, basis[6]!);
    const towardsViewer = new THREE.Vector3(basis[8]!, basis[9]!, basis[10]!);

    const verticalFov = (this.#camera.fov * Math.PI) / 180;
    const tanVertical = Math.tan(verticalFov / 2);
    const tanHorizontal = tanVertical * this.#camera.aspect;

    // For a corner at offset `o` from the centre, the depth from the camera
    // is `distance - o · towardsViewer`. Keeping the corner inside the
    // frustum means `|o · right| <= depth · tanHorizontal`, and the same for
    // the vertical. Solving for the distance gives the two terms below.
    let distance = 0;
    const corner = new THREE.Vector3();
    for (let cornerIndex = 0; cornerIndex < 8; cornerIndex++) {
      corner
        .set(
          cornerIndex & 1 ? box.max.x : box.min.x,
          cornerIndex & 2 ? box.max.y : box.min.y,
          cornerIndex & 4 ? box.max.z : box.min.z,
        )
        .sub(centre);

      const across = Math.abs(corner.dot(right));
      const upDown = Math.abs(corner.dot(up));
      const depth = corner.dot(towardsViewer);

      distance = Math.max(
        distance,
        across / tanHorizontal + depth,
        upDown / tanVertical + depth,
      );
    }

    distance = Math.max(distance * FRAME_MARGIN, this.#controls.minDistance);

    this.#controls.target.copy(centre);
    this.#camera.position.copy(centre).addScaledVector(VIEW_DIRECTION, distance);
    this.#controls.update();
    this.#camera.updateMatrixWorld();
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

  // ---------------------------------------------------------------------
  // Pointer and drag handling
  // ---------------------------------------------------------------------

  #bindPointer(): void {
    const container = this.#container;

    // The capture phase, on the container, so this runs *before* the orbit
    // controls see the event. A drag that starts on a port must not orbit the
    // camera, and a drag that starts on a part must keep orbiting it.
    container.addEventListener('pointerdown', this.#onPointerDown, true);
    window.addEventListener('pointermove', this.#onPointerMove);
    window.addEventListener('pointerup', this.#onPointerUp);

    container.addEventListener('dragover', this.#onDragOver);
    container.addEventListener('dragleave', this.#onDragLeave);
    container.addEventListener('drop', this.#onDrop);

    // The canvas keeps its own handler for selecting a part under the cursor.
    this.#renderer.domElement.addEventListener('pointerdown', this.#onCanvasPointerDown);
  }

  /** Where the pointer is, in normalised device coordinates. */
  #pointerNdc(event: { clientX: number; clientY: number }): THREE.Vector2 {
    const rect = this.#renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
  }

  /** The port under the pointer, if any. */
  #portAt(event: { clientX: number; clientY: number }): PortHit | null {
    this.#raycaster.setFromCamera(this.#pointerNdc(event), this.#camera);
    const hits = this.#raycaster.intersectObjects(this.#portPickables, false);
    const mesh = hits[0]?.object as THREE.Mesh | undefined;
    if (!mesh) return null;
    const data = mesh.userData as {
      componentId?: string;
      portId?: string;
      direction?: PortDirection;
    };
    if (!data.componentId || !data.portId || !data.direction) return null;
    return {
      componentId: data.componentId,
      portId: data.portId,
      direction: data.direction,
    };
  }

  /** The wire under the pointer, if any. */
  #wireAt(event: { clientX: number; clientY: number }): string | null {
    this.#raycaster.setFromCamera(this.#pointerNdc(event), this.#camera);
    const hits = this.#raycaster.intersectObjects(this.#wirePickables, false);
    const mesh = hits[0]?.object as THREE.Mesh | undefined;
    if (!mesh) return null;
    const id = mesh.userData.connectionId as string | undefined;
    return id ?? null;
  }

  /** Where the pointer meets a horizontal plane, used for dropping a part. */
  #benchPoint(event: { clientX: number; clientY: number }, y: number): THREE.Vector3 {
    this.#raycaster.setFromCamera(this.#pointerNdc(event), this.#camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -y);
    const point = new THREE.Vector3();
    if (!this.#raycaster.ray.intersectPlane(plane, point)) {
      point.set(0, y, 0);
    }
    return point;
  }

  #onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;

    const port = this.#portAt(event);
    if (port) {
      // The orbit controls must not see this. A drag that begins on a port
      // is a wire being drawn, not a camera being moved.
      event.preventDefault();
      event.stopPropagation();
      this.#controls.enabled = false;
      this.#pointerHeld = true;
      this.#wiring = {
        ref: { componentId: port.componentId, portId: port.portId },
        direction: port.direction,
      };
      const start = this.#portWorldPosition(port);
      this.#updateWirePreview(start, start);
      return;
    }

    const wire = this.#wireAt(event);
    if (wire) {
      event.stopPropagation();
      this.#controls.enabled = false;
      this.#pointerHeld = true;
      this.#onSelectConnection(wire);
    }
  };

  #onCanvasPointerDown = (event: PointerEvent): void => {
    const rect = this.#renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.#raycaster.setFromCamera(pointer, this.#camera);
    const hits = this.#raycaster.intersectObjects(this.#pickables, true);

    if (hits.length === 0) {
      this.#onSelect(null);
      this.#onSelectConnection(null);
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

  #onPointerMove = (event: PointerEvent): void => {
    if (!this.#wiring) return;
    const start = this.#portWorldPosition(this.#wiring.ref);
    const end = this.#benchPoint(event, start.y);
    this.#updateWirePreview(start, end);
  };

  #onPointerUp = (event: PointerEvent): void => {
    const wiring = this.#wiring;
    this.#wiring = null;
    this.#clearWirePreview();
    if (this.#pointerHeld) {
      this.#pointerHeld = false;
      this.#controls.enabled = true;
    }
    if (!wiring) return;

    const port = this.#portAt(event);
    if (!port) return;
    if (port.componentId === wiring.ref.componentId && port.portId === wiring.ref.portId) return;

    // The wire runs from an output to an input. If the drag began at an
    // input, the other end is the output.
    const other: PortRef = { componentId: port.componentId, portId: port.portId };
    const source = wiring.direction === 'input' ? other : wiring.ref;
    const target = wiring.direction === 'input' ? wiring.ref : other;

    this.#onConnect(source, target);
  };

  #onDragOver = (event: DragEvent): void => {
    if (!event.dataTransfer?.types.includes(DRAG_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    this.#showDropGhost(this.#benchPoint(event, 0));
  };

  #onDragLeave = (): void => {
    this.#hideDropGhost();
  };

  #onDrop = (event: DragEvent): void => {
    const type = event.dataTransfer?.getData(DRAG_TYPE);
    this.#hideDropGhost();
    if (!type) return;
    event.preventDefault();
    this.#onDropComponent(type, this.#benchPoint(event, 0));
  };

  /** Where a port marker sits in the world. */
  #portWorldPosition(port: PortRef): THREE.Vector3 {
    const node = this.#nodes.get(port.componentId);
    if (!node) return new THREE.Vector3();
    const marker = this.#portPickables.find((mesh) => {
      const data = mesh.userData as { componentId?: string; portId?: string };
      return data.componentId === port.componentId && data.portId === port.portId;
    });
    if (!marker) return node.group.position.clone();
    return marker.getWorldPosition(new THREE.Vector3());
  }

  #updateWirePreview(from: THREE.Vector3, to: THREE.Vector3): void {
    if (!this.#wirePreview) {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1, 10),
        new THREE.MeshBasicMaterial({ color: 0x4fd1c5, transparent: true, opacity: 0.9 }),
      );
      this.#scene.add(mesh);
      this.#wirePreview = mesh;
    }

    const direction = new THREE.Vector3().subVectors(to, from);
    const length = direction.length();
    this.#wirePreview.position.copy(from).add(to).multiplyScalar(0.5);
    this.#wirePreview.scale.set(1, Math.max(length, 0.001), 1);
    if (length > 0.0001) {
      this.#wirePreview.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction.normalize(),
      );
    }
  }

  #clearWirePreview(): void {
    if (!this.#wirePreview) return;
    this.#scene.remove(this.#wirePreview);
    this.#wirePreview.geometry.dispose();
    (this.#wirePreview.material as THREE.Material).dispose();
    this.#wirePreview = null;
  }

  #showDropGhost(point: THREE.Vector3): void {
    if (!this.#dropGhost) {
      const ghost = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.05, 10, 32),
        new THREE.MeshBasicMaterial({ color: 0x4fd1c5, transparent: true, opacity: 0.85 }),
      );
      ghost.rotation.x = -Math.PI / 2;
      this.#scene.add(ghost);
      this.#dropGhost = ghost;
    }
    this.#dropGhost.visible = true;
    this.#dropGhost.position.set(point.x, 0.02, point.z);
  }

  #hideDropGhost(): void {
    if (!this.#dropGhost) return;
    this.#dropGhost.visible = false;
  }

  // ---------------------------------------------------------------------
  // The bench
  // ---------------------------------------------------------------------

  /** Rebuild the scene for an experiment. */
  setExperiment(experiment: ExperimentDefinition, registry: ComponentRegistry): void {
    for (const node of this.#nodes.values()) {
      this.#scene.remove(node.group);
      // The name has to be taken off the page too, or the bench ends up with
      // two of every label.
      node.labelElement.remove();
    }
    this.#nodes.clear();
    this.#pickables.length = 0;
    this.#portPickables.length = 0;
    this.#wirePickables.length = 0;
    this.#connectionOwners.clear();

    for (const line of this.#connections) {
      this.#scene.remove(line);
    }
    this.#connections = [];

    // Frame the bench on the experiment, so it fills the viewport whatever
    // shape the window is.
    this.#benchParts = experiment.components.map((c) => ({
      position: c.position,
      labelHeight:
        registry.tryGetDefinition(c.type)?.visual.labelHeight ?? DEFAULT_LABEL_HEIGHT,
    }));
    this.#frameExperiment(this.#benchParts);

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
        // A living thing is made of meshes, and each of them has to be
        // clickable, or the plant cannot be selected.
        for (const child of plant.children) {
          if (child instanceof THREE.Mesh) this.#pickables.push(child);
        }
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

      // The port markers, placed from the definition rather than from a list
      // of known parts.
      const layout = portLayout(definition.ports, portSpan(definition.visual.shape));
      for (const port of definition.ports) {
        const place = layout.get(port.id);
        if (!place) continue;
        const marker = new THREE.Mesh(
          new THREE.SphereGeometry(PORT_MARKER_RADIUS, 14, 10),
          new THREE.MeshBasicMaterial({ color: PORT_COLOURS[port.direction] }),
        );
        marker.position.set(place.x, place.y, place.z);
        marker.userData = {
          componentId: instance.id,
          portId: port.id,
          direction: port.direction,
        };
        group.add(marker);
        this.#portPickables.push(marker);
      }

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
        'letter-spacing: 0.04em',
        'color: #c8d4e8',
        'background: rgba(8, 12, 20, 0.72)',
        'border: 1px solid rgba(44, 58, 92, 0.9)',
        'border-radius: 999px',
        'white-space: nowrap',
        'pointer-events: none',
      ].join(';');
      this.#applyLabelStyle(labelElement);
      labelElement.textContent = instance.label ?? definition.name;
      label.position.set(0, definition.visual.labelHeight ?? DEFAULT_LABEL_HEIGHT, 0);
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
        labelElement,
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
      midpoint.y += 0.5 + from.distanceTo(to) * 0.08;

      const curve = new THREE.QuadraticBezierCurve3(from, midpoint, to);
      // A tube rather than a line. WebGL draws lines one pixel wide whatever
      // you ask for, and a one-pixel wire on a dark bench is invisible. The
      // connection between two disciplines is the thing the product is about,
      // so it has to be seen.
      const geometry = new THREE.TubeGeometry(curve, 48, 0.035, 8, false);
      const colour = DISCIPLINE_COLOURS[source.discipline] ?? '#4fd1c5';
      const wire = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: 0.8 }),
      );
      wire.userData = { connectionId: connection.id };
      this.#scene.add(wire);
      this.#connections.push(wire);
      this.#wirePickables.push(wire);
      this.#connectionOwners.set(connection.id, connection.source.componentId);
    }

    this.#applyConnectionHighlight();

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

  /** Show which wire the user picked out. */
  setSelectedConnection(id: string | null): void {
    this.#selectedConnectionId = id;
    this.#applyConnectionHighlight();
  }

  #applyConnectionHighlight(): void {
    for (const wire of this.#connections) {
      const id = wire.userData.connectionId as string | undefined;
      const material = wire.material as THREE.MeshBasicMaterial;
      const selected = id !== undefined && id === this.#selectedConnectionId;
      material.opacity = selected ? 1 : 0.8;
      if (selected) {
        material.color.set(0xffffff);
      } else {
        const node = id ? this.#nodes.get(this.#connectionSourceId(id)) : undefined;
        material.color.set(node ? DISCIPLINE_COLOURS[node.discipline] ?? '#4fd1c5' : '#4fd1c5');
      }
    }
  }

  #connectionSourceId(connectionId: string): string {
    return this.#connectionOwners.get(connectionId) ?? '';
  }

  /**
   * Animate from the simulation's real readings.
   *
   * Every value here comes from the kernel. Nothing is randomised and nothing
   * is invented.
   *
   * The reading is looked up by the component's *type* and not by a fixed
   * id, so an experiment the user built animates exactly like the shipped
   * one.
   */
  applyReadings(readings: Readonly<Record<string, Quantity>>): void {
    for (const node of this.#nodes.values()) {
      const source = VISUAL_SOURCES[node.type];
      const value = source ? readings[`${node.id}.${source}`]?.value : undefined;

      switch (node.type) {
        case 'biology.plant': {
          const biomass = value ?? 0;
          if (node.plant) {
            const growth = 0.35 + biomass * 1.5;
            node.plant.scale.set(0.7 + biomass * 0.7, growth, 0.7 + biomass * 0.7);
          }
          break;
        }
        case 'materials.substrate': {
          // A wet medium is dark and glossy; a dry one is pale and matte.
          const moisture = value ?? 1;
          const wet = new THREE.Color(0x3b2f28);
          const dry = new THREE.Color(0x9c8a76);
          const colour = wet.clone().lerp(dry, 1 - moisture);
          for (const material of node.emissiveMaterials) material.color.copy(colour);
          break;
        }
        case 'electronics.led': {
          const brightness = value ?? 0;
          const glow = brightness * 0.75;
          for (const material of node.emissiveMaterials) material.emissiveIntensity = glow * 2;
          (node.glow.material as THREE.MeshBasicMaterial).opacity = glow;
          node.glow.scale.setScalar(1 + brightness * 0.4);
          break;
        }
        case 'electronics.sensor': {
          const signal = value ?? 0;
          for (const material of node.emissiveMaterials) {
            material.emissiveIntensity = signal * 0.9;
          }
          (node.glow.material as THREE.MeshBasicMaterial).opacity = signal * 0.3;
          break;
        }
        case 'electronics.comparator': {
          const decision = value ?? 0;
          for (const material of node.emissiveMaterials) {
            material.emissiveIntensity = decision * 1.6;
            material.emissive.set(decision > 0.5 ? 0xff8f5e : 0x1b2740);
          }
          break;
        }
        case 'chemistry.reaction-vessel': {
          // An empty vessel is pale glass. As the product builds, the liquid
          // takes on its colour.
          const product = Math.min(1, (value ?? 0) / 0.7);
          const empty = new THREE.Color(0x9fb4c7);
          const full = new THREE.Color(0xf0b350);
          const colour = empty.clone().lerp(full, product);
          for (const material of node.emissiveMaterials) {
            material.color.copy(colour);
            material.emissiveIntensity = product * 0.35;
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

  /**
   * Set a label's type and padding to the current scale.
   *
   * The font and the padding move together, so a small label is a smaller
   * label and not a different shape.
   */
  #applyLabelStyle(element: HTMLElement): void {
    const scale = this.#labelScale;
    element.style.font = `500 ${(11 * scale).toFixed(1)}px/1.2 ui-sans-serif, system-ui, sans-serif`;
    element.style.padding = `${(3 * scale).toFixed(1)}px ${(9 * scale).toFixed(1)}px`;
  }

  resize(): void {
    const width = this.#container.clientWidth;
    const height = this.#container.clientHeight;
    if (width === 0 || height === 0) return;

    this.#camera.aspect = width / height;
    this.#camera.updateProjectionMatrix();
    this.#renderer.setSize(width, height);
    this.#labelRenderer.setSize(width, height);

    // The labels are DOM, so they have to be told about the new size
    // themselves.
    const scale = labelScaleFor(width);
    if (scale !== this.#labelScale) {
      this.#labelScale = scale;
      for (const node of this.#nodes.values()) {
        this.#applyLabelStyle(node.labelElement);
      }
    }

    // The fit depends on the shape of the viewport, so the bench is framed
    // again for the new one.
    this.#frameExperiment(this.#benchParts);
  }

  dispose(): void {
    this.#disposed = true;
    this.#clearWirePreview();

    for (const node of this.#nodes.values()) {
      node.labelElement.remove();
    }
    this.#nodes.clear();

    // The listeners have to come off. The scene is built inside an effect,
    // and a development build runs that effect twice, so a scene that is
    // disposed without unsubscribing would still be listening. Two scenes
    // answering the same click is two parts on the bench.
    this.#container.removeEventListener('pointerdown', this.#onPointerDown, true);
    window.removeEventListener('pointermove', this.#onPointerMove);
    window.removeEventListener('pointerup', this.#onPointerUp);
    this.#container.removeEventListener('dragover', this.#onDragOver);
    this.#container.removeEventListener('dragleave', this.#onDragLeave);
    this.#container.removeEventListener('drop', this.#onDrop);
    this.#renderer.domElement.removeEventListener('pointerdown', this.#onCanvasPointerDown);

    this.#controls.dispose();
    this.#renderer.dispose();
    this.#renderer.domElement.remove();
    this.#labelRenderer.domElement.remove();
  }
}
