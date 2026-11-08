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
['box', 'cylinder', 'sphere', 'plate', 'organic'].forEach(writeThumbnail);
