'use client';

/**
 * The component library.
 *
 * Every component the product knows about, grouped by discipline. Each entry
 * carries its confidence level, because that is part of what a component *is*
 * in FrankenLab — not a footnote.
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useLabStore } from '@/state/lab';
import { DISCIPLINE_COLOURS, DISCIPLINE_ORDER } from '@/world';
import { DRAG_TYPE } from '@/drag';
import { CONFIDENCE_LABEL } from '@/confidence';
import type { ComponentDefinition } from '@/kernel/types';

const INVENTORY_MODELS: Readonly<Record<string, string>> = {
  'electronics.resistor': '/assets/glb/resistor.glb',
  'electronics.voltage-source': '/assets/glb/battery.glb',
  'electronics.led': '/assets/glb/led.glb',
  'electronics.switch': '/assets/glb/logger.glb',
  'electronics.sensor': '/assets/glb/logger.glb',
  'electronics.comparator': '/assets/glb/logger.glb',
  'biology.bio-battery': '/assets/glb/bio-battery.glb',
  'chemistry.substance': '/assets/catalogue/bottle_glassware_beaker_medium.glb',
  'chemistry.reaction-vessel': '/assets/catalogue/bottle_glassware_erlenmeyer_flask_medium.glb',
  'biology.nutrient-source': '/assets/catalogue/bottle_glassware_erlenmeyer_flask_medium.glb',
  'biology.moisture-source': '/assets/catalogue/bottle_micropipet.glb',
  'materials.substrate': '/assets/catalogue/bottle_test_tube_rack.glb',
  'materials.conductor': '/assets/glb/resistor.glb',
};

function InventoryModelPreview({ modelPath, colour, alt }: { modelPath: string; colour: string; alt: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const width = 56;
    const height = 56;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, width / height, 0.01, 100);
    camera.position.set(1.8, 1.1, 2.3);
    camera.lookAt(0, 0.1, 0);
    scene.add(new THREE.HemisphereLight(0xf5fbff, 0x233044, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(2, 3, 4);
    scene.add(key);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute('aria-label', alt);
    renderer.domElement.setAttribute('role', 'img');
    host.replaceChildren(renderer.domElement);

    const loader = new GLTFLoader();
    loader.load(modelPath, (gltf) => {
      if (!host.isConnected) return;
      const model = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const centre = bounds.getCenter(new THREE.Vector3());
      const largest = Math.max(size.x, size.y, size.z, 0.001);
      model.scale.multiplyScalar(1.2 / largest);
      model.position.sub(centre.multiplyScalar(model.scale.x));
      model.rotation.y = -0.35;
      model.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.castShadow = true;
        child.receiveShadow = true;
      });
      scene.add(model);
      renderer.render(scene, camera);
    });

    return () => {
      renderer.dispose();
      host.replaceChildren();
    };
  }, [alt, modelPath]);

  return (
    <div
      ref={hostRef}
      className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-lab-line bg-[#eef1f1]"
      style={{ boxShadow: `inset 0 0 18px ${colour}22` }}
      aria-label={alt}
    />
  );
}

function InventoryVisual({ definition, colour }: { definition: ComponentDefinition; colour: string }) {
  const visual = definition.inventoryVisual;
  const modelPath = visual?.model ?? INVENTORY_MODELS[definition.type];
  const image = visual?.thumbnail ?? visual?.image;
  if (modelPath) return <InventoryModelPreview modelPath={modelPath} colour={colour} alt={visual?.alt ?? `${definition.name} model`} />;
  return (
    <div
      className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-lab-line bg-[#eef1f1]"
      style={{ boxShadow: `inset 0 0 18px ${colour}22` }}
      aria-label={visual?.alt ?? `${definition.name} technical silhouette`}
    >
      {image ? (
        // Local artwork is preferred, but every card has the CSS fallback below.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={visual?.alt ?? definition.name} className="h-full w-full object-contain p-1" />
      ) : (
        <div className="relative h-9 w-9" aria-hidden>
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border-2 ${
              definition.visual.shape === 'cylinder' ? 'h-8 w-5 rounded-full' :
              definition.visual.shape === 'sphere' || definition.visual.shape === 'organic' ? 'h-8 w-8 rounded-full' :
              definition.visual.shape === 'torus' ? 'h-8 w-8 rounded-full border-[5px]' :
              definition.visual.shape === 'plate' ? 'h-3 w-9 rounded-sm' : 'h-6 w-8 rounded-sm'
            }`}
            style={{ borderColor: colour, background: `${colour}22`, boxShadow: `0 0 12px ${colour}44` }}
          />
          <span className="absolute bottom-0 left-1/2 h-px w-8 -translate-x-1/2 bg-lab-dim/60" />
        </div>
      )}
      <span className="absolute bottom-0.5 right-1 text-[8px] uppercase tracking-widest text-lab-dim">
        {visual?.kind === 'cutaway' ? 'CUT' : 'LAB'}
      </span>
    </div>
  );
}

export function Library() {
  const registry = useLabStore((s) => s.registry);
  const experiment = useLabStore((s) => s.experiment);
  const selectedId = useLabStore((s) => s.selectedId);
  const select = useLabStore((s) => s.select);
  const addComponentHere = useLabStore((s) => s.addComponentHere);
  const [collapsedDisciplines, setCollapsedDisciplines] = useState<Set<string>>(new Set());

  const disciplines = registry.listDisciplines().filter((d) => d.id !== '__couplings__');
  const ordered = [
    ...DISCIPLINE_ORDER.map((id) => disciplines.find((d) => d.id === id)).filter(
      (d): d is NonNullable<typeof d> => Boolean(d),
    ),
    ...disciplines.filter((d) => !DISCIPLINE_ORDER.includes(d.id as never)),
  ];

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-lab-panel">
      <div className="shrink-0 border-b border-lab-line px-4 py-4">
        <h2 className="lab-label m-0">Components inventory</h2>
        <p className="mt-1 text-[13px] leading-snug text-lab-muted">
          {/* Dragging is a pointer gesture. A phone gets the add button. */}
          <span className="hidden lg:inline">
            Drag a part onto the bench, or press the add button to put it there.
          </span>
          <span className="lg:hidden">
            Press the add button to put a part on the bench.
          </span>
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        {ordered.map((discipline) => {
          const colour = DISCIPLINE_COLOURS[discipline.id] ?? '#4fd1c5';
          const collapsed = collapsedDisciplines.has(discipline.id);
          return (
            <section key={discipline.id} className="mb-4">
              <button
                type="button"
                onClick={() => setCollapsedDisciplines((current) => {
                  const next = new Set(current);
                  if (next.has(discipline.id)) next.delete(discipline.id);
                  else next.add(discipline.id);
                  return next;
                })}
                aria-expanded={!collapsed}
                className="flex w-full items-center gap-2 px-2 pb-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lab-accent"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: colour }}
                  aria-hidden
                />
                <span className="lab-label m-0 flex-1">{discipline.name}</span>
                <span className="text-[14px] text-lab-dim" aria-hidden>{collapsed ? '+' : '−'}</span>
              </button>
              {!collapsed && <ul className="space-y-1">
                {discipline.components.map((definition) => {
                  const used = experiment.components.filter(
                    (c) => c.type === definition.type,
                  );
                  const active = used.some((c) => c.id === selectedId);

                  return (
                    <li key={definition.type} className="flex items-stretch gap-1">
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          // The bench takes the part type and puts a part of
                          // that type where it is dropped.
                          event.dataTransfer.setData(DRAG_TYPE, definition.type);
                          event.dataTransfer.effectAllowed = 'copy';
                        }}
                        onClick={() => select(used[0]?.id ?? null)}
                        title={`Drag onto the bench to add a ${definition.name}`}
                        className={[
                          'flex-1 cursor-grab rounded-xl border px-2 py-2 text-left transition-colors active:cursor-grabbing',
                          'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lab-accent',
                          active
                            ? 'border-lab-accent/60 bg-lab-accent/10'
                            : 'border-transparent hover:border-lab-line hover:bg-lab-panel-raised',
                        ].join(' ')}
                      >
                        <div className="flex items-center gap-2">
                          <InventoryVisual definition={definition} colour={colour} />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate text-[13px] text-lab-text">{definition.name}</span>
                              {used.length > 0 && (
                                <span className="lab-value rounded bg-lab-line px-1.5 py-0.5 text-[10px] text-lab-muted">
                                  {used.length}
                                </span>
                              )}
                            </span>
                            <span className="mt-0.5 block text-[10px] leading-snug text-lab-muted">{definition.description}</span>
                            <span className="mt-1 block text-[9px] uppercase tracking-wider text-lab-dim">
                              {CONFIDENCE_LABEL[definition.confidence] ?? definition.confidence} · {definition.inventoryVisual?.kind ?? 'technical silhouette'}
                            </span>
                          </span>
                        </div>
                      </button>

                      {/* Dragging is a pointer gesture. This is the same
                          action, reachable from the keyboard. */}
                      <button
                        type="button"
                        onClick={() => addComponentHere(definition.type)}
                        aria-label={`Add a ${definition.name} to the bench`}
                        title={`Add a ${definition.name} to the bench`}
                        className={[
                          'w-8 shrink-0 rounded-md border border-transparent text-[15px] leading-none text-lab-dim',
                          'transition-colors hover:border-lab-accent/40 hover:text-lab-accent',
                          'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lab-accent',
                        ].join(' ')}
                      >
                        +
                      </button>
                    </li>
                  );
                })}
              </ul>}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
