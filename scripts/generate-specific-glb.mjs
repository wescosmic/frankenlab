/** Build recognisable local bench models for catalogue parts that previously reused unrelated GLBs. */
import { writeFileSync } from 'node:fs';
import * as T from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

globalThis.FileReader = class FileReader {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then((bytes) => { this.result = bytes; this.onloadend?.(); }); }
};

const M = (color, opacity = 1, metalness = 0.05) => new T.MeshStandardMaterial({ color, roughness: 0.42, metalness, transparent: opacity < 1, opacity, side: T.DoubleSide });
const dark = M(0x222a31), steel = M(0xb7bec2, 1, 0.7), glass = M(0xb8e0e7, 0.32), green = M(0x278348), soil = M(0x574334), blue = M(0x2768a3), copper = M(0xc77c43, 1, 0.55);
const box = (g, size, pos, mat) => { const o = new T.Mesh(new T.BoxGeometry(...size), mat); o.position.set(...pos); g.add(o); return o; };
const cyl = (g, radius, height, pos, mat, segments = 20) => { const o = new T.Mesh(new T.CylinderGeometry(radius, radius, height, segments), mat); o.position.set(...pos); g.add(o); return o; };
const ball = (g, radius, pos, mat) => { const o = new T.Mesh(new T.SphereGeometry(radius, 12, 8), mat); o.position.set(...pos); g.add(o); return o; };
const wire = (g, a, b, mat, radius = 0.017) => { const delta = new T.Vector3(...b).sub(new T.Vector3(...a)); const o = cyl(g, radius, delta.length(), new T.Vector3(...a).addScaledVector(delta, 0.5).toArray(), mat, 9); o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize()); };
const pcb = (g) => { box(g, [0.88, 0.055, 0.6], [0, -0.23, 0], M(0x17604a)); for (const x of [-0.35, 0.35]) for (const z of [-0.22, 0.22]) cyl(g, 0.025, 0.065, [x, -0.19, z], steel, 10); };
const vessel = (g, mat = glass) => { cyl(g, 0.3, 0.72, [0, 0, 0], mat, 24); cyl(g, 0.31, 0.045, [0, 0.37, 0], steel); cyl(g, 0.31, 0.045, [0, -0.37, 0], steel); };

function make(type) {
  const g = new T.Group();
  if (type === 'switch') { pcb(g); box(g, [0.43, 0.15, 0.4], [0, -0.12, 0], steel); cyl(g, 0.13, 0.15, [0, 0.02, 0], dark); }
  else if (type === 'sensor') { pcb(g); for (const x of [-0.17, 0.17]) box(g, [0.12, 0.55, 0.04], [x, -0.53, 0.04], steel); box(g, [0.18, 0.12, 0.16], [0.1, -0.13, 0], dark); }
  else if (type === 'comparator') { pcb(g); box(g, [0.22, 0.1, 0.16], [0.02, -0.14, 0], dark); cyl(g, 0.1, 0.13, [-0.24, -0.12, 0], blue); for (const x of [-0.35, 0.35]) box(g, [0.12, 0.16, 0.2], [x, -0.12, 0.19], blue); }
  else if (type === 'nutrient-source' || type === 'enzyme') { vessel(g); cyl(g, 0.26, 0.32, [0, -0.16, 0], type === 'enzyme' ? M(0xbb862e, 0.8) : M(0x3aa365, 0.8)); cyl(g, 0.2, 0.1, [0, 0.42, 0], type === 'enzyme' ? dark : green); }
  else if (type === 'bio-battery') { for (const x of [-0.3, 0.3]) { box(g, [0.43, 0.62, 0.46], [x, -0.05, 0], glass); box(g, [0.38, 0.28, 0.41], [x, -0.2, 0], x < 0 ? M(0x745839, 0.85) : M(0x8bc9c6, 0.65)); box(g, [0.08, 0.38, 0.22], [x, -0.04, 0], dark); box(g, [0.45, 0.06, 0.48], [x, 0.29, 0], steel); } wire(g, [-0.3, 0.35, 0], [0.3, 0.35, 0], M(0xc73535), 0.035); wire(g, [-0.08, -0.19, 0], [0.08, -0.19, 0], glass, 0.06); }
  else if (type === 'microbial-culture') { cyl(g, 0.38, 0.11, [0, -0.28, 0], glass, 32); cyl(g, 0.36, 0.025, [0, -0.22, 0], M(0xd4b478, 0.9), 32); for (let i = 0; i < 12; i++) ball(g, 0.025 + i % 3 * 0.01, [Math.cos(i * 2.4) * 0.26, -0.195, Math.sin(i * 2.4) * 0.25], M(i % 2 ? 0xe7d69b : 0x9ab867)); cyl(g, 0.39, 0.04, [0, -0.13, 0], glass, 32); }
  else if (type === 'gas-exchange') { vessel(g); wire(g, [-0.48, -0.06, 0], [-0.25, -0.06, 0], blue, 0.045); wire(g, [0.25, 0.14, 0], [0.48, 0.14, 0], green, 0.045); }
  else if (type === 'root-system') { wire(g, [0, 0.43, 0], [0, 0.05, 0], soil, 0.07); for (let i = 0; i < 11; i++) { const a = i * 2.4; const y = 0.07 - i * 0.035; wire(g, [0, y, 0], [Math.cos(a) * (0.24 + i * 0.012), y - 0.32, Math.sin(a) * 0.2], soil, 0.012); } }
  else if (type === 'compost-reactor') { vessel(g); cyl(g, 0.27, 0.42, [0, -0.12, 0], soil); for (let i = 0; i < 12; i++) box(g, [0.06, 0.03, 0.05], [Math.cos(i * 3) * 0.19, -0.32 + i * 0.032, Math.sin(i * 3) * 0.17], M(0x8c6944)); wire(g, [0.14, 0.36, 0], [0.14, 0.65, 0], steel, 0.035); }
  else if (type === 'catalyst-bed' || type === 'filter-media') { vessel(g); for (let i = 0; i < 5; i++) { const y = -0.28 + i * 0.13; cyl(g, 0.28, 0.1, [0, y, 0], M(type === 'filter-media' ? [0xc7bca6, 0x444c51, 0xb8a57c, 0xddddca, 0x675946][i] : 0xcfb990)); } }
  else if (type === 'heat-bath') { box(g, [0.95, 0.5, 0.8], [0, -0.12, 0], steel); box(g, [0.75, 0.025, 0.6], [0, 0.15, 0], blue); box(g, [0.3, 0.14, 0.02], [0.18, -0.22, 0.41], dark); }
  else if (type === 'substrate') { box(g, [0.95, 0.12, 0.7], [0, -0.34, 0], steel); box(g, [0.85, 0.22, 0.62], [0, -0.17, 0], soil); for (let i = 0; i < 16; i++) ball(g, 0.04, [Math.sin(i * 13) * 0.38, -0.045, Math.cos(i * 7) * 0.27], M(i % 2 ? 0x463a2f : 0x75614b)); }
  else if (type === 'conductor') { cyl(g, 0.23, 0.34, [0, -0.14, 0], dark); for (let i = 0; i < 12; i++) { const a = i * 0.47; wire(g, [Math.cos(a)*0.23, -0.29 + i*0.028, Math.sin(a)*0.23], [Math.cos(a+0.5)*0.23, -0.27 + i*0.028, Math.sin(a+0.5)*0.23], copper, 0.035); } }
  else if (type === 'light-source') { box(g, [0.85, 0.1, 0.55], [0, 0.28, 0], dark); for (const x of [-0.3, -0.1, 0.1, 0.3]) for (const z of [-0.16, 0, 0.16]) ball(g, 0.042, [x, 0.215, z], M(0xe24c8d)); wire(g, [-0.43, 0.26, 0], [-0.43, -0.48, 0], steel, 0.035); box(g, [0.5, 0.04, 0.35], [-0.43, -0.52, 0], dark); }
  return g;
}

for (const type of ['switch','sensor','comparator','nutrient-source','enzyme','bio-battery','microbial-culture','gas-exchange','root-system','compost-reactor','catalyst-bed','heat-bath','substrate','conductor','filter-media','light-source']) {
  const scene = new T.Scene(); scene.add(make(type));
  await new Promise((resolve, reject) => new GLTFExporter().parse(scene, (result) => { writeFileSync(new URL(`../public/assets/glb/catalogue-${type}.glb`, import.meta.url), Buffer.from(result)); resolve(); }, reject, { binary: true }));
}
