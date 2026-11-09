/** Generate the small local GLB kit used by the catalogue's visual fallback. */
import { mkdirSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

globalThis.FileReader = class FileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
};

const output = new URL('../public/assets/glb/', import.meta.url);
mkdirSync(output, { recursive: true });
const thumbnails = new URL('../public/assets/inventory/', import.meta.url);
mkdirSync(thumbnails, { recursive: true });

function meshFor(shape) {
  const material = new THREE.MeshStandardMaterial({ color: 0x4fd1c5, roughness: 0.48, metalness: 0.2 });
  if (shape === 'cylinder') return new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 1, 24), material);
  if (shape === 'sphere' || shape === 'organic') return new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), material);
  if (shape === 'plate') return new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.22, 32), material);
  return new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.75), material);
}

const mat = (colour, metalness = 0.12, roughness = 0.45) => new THREE.MeshStandardMaterial({ color: colour, metalness, roughness });
const addBox = (group, size, position, material) => { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.position.set(...position); group.add(mesh); return mesh; };
const addCylinder = (group, radius, height, position, material, radialSegments = 24) => { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, radialSegments), material); mesh.position.set(...position); group.add(mesh); return mesh; };

function customModel(name) {
  const group = new THREE.Group();
  const dark = mat(0x1a2432, 0.35, 0.35);
  const metal = mat(0xb9c4cf, 0.72, 0.24);
  const teal = mat(0x4fd1c5, 0.18, 0.3);
  const blue = mat(0x3d77b8, 0.25, 0.3);
  const red = mat(0xef6461, 0.2, 0.28);
  const yellow = mat(0xf0b350, 0.12, 0.32);
  if (name === 'resistor') {
    addCylinder(group, 0.14, 0.8, [0, 0, 0], mat(0xd2a66c), 20).rotation.z = Math.PI / 2;
    for (const [x, colour] of [[-0.25, 0x6d4029], [-0.08, 0xd44c37], [0.1, 0x1d3a78], [0.27, 0xd9b84b]]) addBox(group, [0.045, 0.3, 0.3], [x, 0, 0], mat(colour));
    addCylinder(group, 0.025, 1.5, [0, 0, 0], metal, 10).rotation.z = Math.PI / 2;
  } else if (name === 'battery') {
    addCylinder(group, 0.32, 0.82, [0, 0, 0], dark);
    addCylinder(group, 0.14, 0.08, [0, 0.45, 0], metal);
    addBox(group, [0.34, 0.5, 0.02], [0, 0, 0.33], red);
  } else if (name === 'led') {
    addCylinder(group, 0.18, 0.3, [0, 0.15, 0], metal);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 12), new THREE.MeshStandardMaterial({ color: 0xef6461, emissive: 0xef6461, emissiveIntensity: 0.7, transparent: true, opacity: 0.9 })); dome.position.y = 0.38; group.add(dome);
    addCylinder(group, 0.018, 0.7, [-0.08, -0.2, 0], metal, 8).rotation.z = 0.16;
    addCylinder(group, 0.018, 0.7, [0.08, -0.2, 0], metal, 8).rotation.z = -0.16;
  } else if (name === 'capacitor') {
    addCylinder(group, 0.3, 0.7, [0, 0, 0], blue);
    addCylinder(group, 0.31, 0.04, [0, 0.37, 0], metal);
    addCylinder(group, 0.31, 0.04, [0, -0.37, 0], metal);
    addCylinder(group, 0.025, 0.8, [0, 0.48, 0], metal, 8);
  } else if (name === 'solar-panel') {
    addBox(group, [0.95, 0.08, 0.72], [0, 0, 0], dark);
    for (const x of [-0.3, 0, 0.3]) addBox(group, [0.02, 0.09, 0.66], [x, 0.05, 0], teal);
    for (const z of [-0.22, 0, 0.22]) addBox(group, [0.9, 0.09, 0.02], [0, 0.05, z], teal);
    group.rotation.x = -0.3;
  } else if (name === 'motor') {
    addCylinder(group, 0.32, 0.65, [0, 0, 0], metal);
    addCylinder(group, 0.08, 0.45, [0, 0, 0.5], metal, 16).rotation.x = Math.PI / 2;
    addBox(group, [0.55, 0.08, 0.08], [0, 0.33, 0], red);
  } else if (name === 'logger') {
    addBox(group, [0.9, 0.55, 0.25], [0, 0, 0], dark);
    addBox(group, [0.48, 0.22, 0.02], [0, 0.1, 0.14], teal);
    for (const x of [-0.25, 0, 0.25]) addCylinder(group, 0.035, 0.04, [x, -0.15, 0.15], yellow, 12);
  } else if (name === 'electrode') {
    addBox(group, [0.18, 0.8, 0.06], [0, 0, 0], metal);
    addCylinder(group, 0.04, 0.55, [0, 0.6, 0], red, 12);
    addCylinder(group, 0.03, 0.9, [0, -0.75, 0], dark, 10);
  } else if (name === 'greenhouse') {
    const glass = new THREE.MeshStandardMaterial({ color: 0x9ed9eb, transparent: true, opacity: 0.34, roughness: 0.12 });
    addBox(group, [1.15, 0.04, 0.04], [0, -0.5, -0.55], metal); addBox(group, [1.15, 0.04, 0.04], [0, -0.5, 0.55], metal);
    addBox(group, [0.04, 1.1, 0.04], [-0.55, 0, -0.55], metal); addBox(group, [0.04, 1.1, 0.04], [0.55, 0, -0.55], metal);
    addBox(group, [1.1, 1.0, 0.04], [0, 0, -0.55], glass);
    addBox(group, [1.1, 0.04, 1.1], [0, 0.5, 0], glass);
    addCylinder(group, 0.12, 0.3, [0, -0.25, 0], teal);
  } else if (name === 'thermal-mass') {
    addBox(group, [0.85, 0.68, 0.7], [0, 0, 0], metal);
    for (const x of [-0.28, -0.09, 0.1, 0.29]) addBox(group, [0.04, 0.8, 0.62], [x, 0, 0], yellow);
  } else if (name === 'chamber') {
    addBox(group, [0.95, 1.05, 0.8], [0, 0, 0], dark);
    addBox(group, [0.7, 0.62, 0.03], [0, 0.08, 0.42], new THREE.MeshStandardMaterial({ color: 0x9ed9eb, transparent: true, opacity: 0.4 }));
    addBox(group, [0.12, 0.04, 0.04], [0.28, -0.3, 0.45], teal);
  } else if (name === 'bio-battery') {
    addCylinder(group, 0.34, 0.78, [0, 0, 0], new THREE.MeshStandardMaterial({ color: 0x7bc96f, transparent: true, opacity: 0.62 }));
    addCylinder(group, 0.035, 0.9, [-0.14, 0, 0], metal, 10); addCylinder(group, 0.035, 0.9, [0.14, 0, 0], red, 10);
    addCylinder(group, 0.08, 0.05, [0, 0.42, 0], metal);
  } else if (name === 'substrate') {
    addBox(group, [1.0, 0.28, 0.75], [0, -0.22, 0], mat(0x8d6e63));
    for (const x of [-0.3, 0, 0.3]) addCylinder(group, 0.04, 0.45, [x, 0.15, 0], teal, 10);
  } else {
    addBox(group, [0.9, 0.7, 0.75], [0, 0, 0], teal);
  }
  return group;
}

function exportModel(name, object) {
  const scene = new THREE.Scene(); scene.add(object);
  return new Promise((resolve, reject) => new GLTFExporter().parse(scene, (result) => { writeFileSync(new URL(`${name}.glb`, output), Buffer.from(result)); resolve(); }, reject, { binary: true }));
}

function exportShape(shape) {
  const scene = new THREE.Scene();
  scene.add(meshFor(shape));
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(scene, (result) => {
      writeFileSync(new URL(`${shape}.glb`, output), Buffer.from(result));
      resolve();
    }, reject, { binary: true });
  });
}

function writeThumbnail(shape) {
  const body = shape === 'cylinder'
    ? '<ellipse cx="64" cy="36" rx="24" ry="9"/><path d="M40 36v54c0 12 48 12 48 0V36"/>'
    : shape === 'plate'
      ? '<ellipse cx="64" cy="64" rx="46" ry="18"/><path d="M18 64v12c0 20 92 20 92 0V64"/>'
      : shape === 'sphere' || shape === 'organic'
        ? '<circle cx="64" cy="62" r="34"/>'
        : '<rect x="28" y="32" width="72" height="58" rx="8"/>';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="14" fill="#111820"/><g fill="#4fd1c5" fill-opacity=".18" stroke="#4fd1c5" stroke-width="4">${body}</g><path d="M18 103h92" stroke="#64748b" stroke-opacity=".7"/><circle cx="100" cy="104" r="3" fill="#f0b350"/></svg>`;
  writeFileSync(new URL(`${shape}.svg`, thumbnails), svg);
}

await Promise.all(['box', 'cylinder', 'sphere', 'plate', 'organic'].map(exportShape));
await Promise.all(['resistor', 'battery', 'led', 'capacitor', 'solar-panel', 'motor', 'logger', 'electrode', 'greenhouse', 'thermal-mass', 'chamber', 'bio-battery', 'substrate'].map((name) => exportModel(name, customModel(name))));
['box', 'cylinder', 'sphere', 'plate', 'organic'].forEach(writeThumbnail);
