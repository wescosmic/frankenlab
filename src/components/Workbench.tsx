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
import { useLabStore, SPEED_TARGET_SECONDS } from '@/state/lab';

/** How often the readings are republished to React, in milliseconds. */
const PUBLISH_INTERVAL = 90;

/**
 * How many simulation steps the run is due to have taken by now.
 *
 * The speed is a target wall time for the whole experiment. The simulated
 * rate is the experiment's own duration divided by that target, so a run that
 * steps once a minute and a run that steps once an hour both take the same
 * time to watch.
 *
 * The run is measured against the wall clock from the moment it started, not
 * against the number of frames that have gone by, so a slow laptop and a fast
 * one play the experiment at the same speed.
 *
 * The answer is a *target*, not an increment: the loop advances the
 * simulation to the target rather than adding to it. That keeps the run
 * honest when a frame is dropped or the tab is in the background.
 */
function targetStep(
  dt: number,
  wallSeconds: number,
  anchorSeconds: number,
  durationSeconds: number,
  targetWallSeconds: number,
): number {
  const rate = durationSeconds / targetWallSeconds;
  const targetSeconds = anchorSeconds + rate * wallSeconds;
  return Math.floor(targetSeconds / dt);
}

export function Workbench() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<LabScene | null>(null);

  const experiment = useLabStore((s) => s.experiment);
  const registry = useLabStore((s) => s.registry);
  const selectedId = useLabStore((s) => s.selectedId);
  const selectedConnectionId = useLabStore((s) => s.selectedConnectionId);
  const select = useLabStore((s) => s.select);
  const selectConnection = useLabStore((s) => s.selectConnection);
  const connect = useLabStore((s) => s.connect);
  const addComponent = useLabStore((s) => s.addComponent);

  // Build the scene once.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new LabScene({
      container,
      onSelect: (id) => select(id),
      onConnect: (source, target) => connect(source, target),
      onDropComponent: (type, position) => addComponent(type, position),
      onSelectConnection: (id) => selectConnection(id),
    });
    sceneRef.current = scene;

    const handleResize = () => scene.resize();
    window.addEventListener('resize', handleResize);

    let frame = 0;
    let lastPublish = 0;

    // Wall-clock accounting for the run speed. `runAnchor` is the wall clock
    // moment the current speed segment began, and `secondsAnchor` is how many
    // simulated seconds had been delivered by then. The anchors are reset
    // whenever the run starts, restarts or changes speed, so the clock only
    // counts the time the run was actually playing.
    let runAnchor = performance.now();
    let secondsAnchor = 0;
    let lastSpeed = useLabStore.getState().speed;
    let lastStatus = useLabStore.getState().status;
    let lastElapsed = 0;

    const loop = () => {
      const state = useLabStore.getState();
      const now = performance.now();

      const restarted = state.elapsed < lastElapsed;
      const speedChanged = state.speed !== lastSpeed;
      const statusChanged = state.status !== lastStatus;

      if (restarted || speedChanged || statusChanged) {
        runAnchor = now;
        secondsAnchor = state.elapsed;
        lastSpeed = state.speed;
        lastStatus = state.status;
      }
      lastElapsed = state.elapsed;

      if (state.status === 'running' && now - lastPublish >= PUBLISH_INTERVAL) {
        lastPublish = now;
        const dt = state.experiment.dt;
        const due = targetStep(
          dt,
          (now - runAnchor) / 1000,
          secondsAnchor,
          state.experiment.duration,
          SPEED_TARGET_SECONDS[state.speed],
        );
        const taken = Math.round(state.elapsed / dt);
        const steps = Math.min(due - taken, Math.ceil((state.experiment.duration - state.elapsed) / dt));
        if (steps > 0) state.advance(steps);
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
  }, [select, selectConnection, connect, addComponent]);

  // Rebuild the bench when the experiment changes.
  useEffect(() => {
    sceneRef.current?.setExperiment(experiment, registry);
  }, [experiment, registry]);

  useEffect(() => {
    sceneRef.current?.setSelection(selectedId);
  }, [selectedId]);

  useEffect(() => {
    sceneRef.current?.setSelectedConnection(selectedConnectionId);
  }, [selectedConnectionId]);

  return <div ref={containerRef} className="absolute inset-0" />;
}
