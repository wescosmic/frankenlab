'use client';

/**
 * The 3D workbench.
 *
 * Owns the Three.js scene and the frame loop. The loop advances the
 * simulation and republishes the readings on a fixed cadence, so a long run
 * stays smooth without flooding React with renders.
 */

import { useEffect, useRef } from 'react';
import { LabScene } from '@/three/lab-scene';
import { useLabStore } from '@/state/lab';

/** How often the readings are republished to React, in milliseconds. */
const PUBLISH_INTERVAL = 90;

/** How many simulation steps to advance per publish. */
const STEPS_PER_PUBLISH = 18;

export function Workbench() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<LabScene | null>(null);

  const experiment = useLabStore((s) => s.experiment);
  const registry = useLabStore((s) => s.registry);
  const selectedId = useLabStore((s) => s.selectedId);
  const select = useLabStore((s) => s.select);

  // Build the scene once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new LabScene({ container, onSelect: (id) => select(id) });
    sceneRef.current = scene;

    const handleResize = () => scene.resize();
    window.addEventListener('resize', handleResize);

    let frame = 0;
    let lastPublish = 0;

    const loop = () => {
      const state = useLabStore.getState();
      const now = performance.now();

      if (state.status === 'running' && now - lastPublish >= PUBLISH_INTERVAL) {
        lastPublish = now;
        state.advance(STEPS_PER_PUBLISH);
      }

      scene.applyReadings(useLabStore.getState().readings);
      scene.render();
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleResize);
      scene.dispose();
      sceneRef.current = null;
    };
  }, [select]);

  // Rebuild the bench when the experiment changes.
  useEffect(() => {
    sceneRef.current?.setExperiment(experiment, registry);
  }, [experiment, registry]);

  useEffect(() => {
    sceneRef.current?.setSelection(selectedId);
  }, [selectedId]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
