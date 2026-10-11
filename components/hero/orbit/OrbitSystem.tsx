'use client';

import { useEffect, useState } from 'react';
import {
  CORE_Z,
  NODES,
  ORBIT_OPACITY,
  PARTICLES,
  PULSE_AMP_1,
  PULSE_AMP_2,
  PULSE_FREQ_1,
  PULSE_FREQ_2,
  PULSE_PHASE_2,
  SIGNAL_SPEED,
  SIGNAL_TAIL_DT,
  SYSTEM_SIZE,
  VIEWBOX,
} from './config';
import { bodyAt } from './math';

import { Core } from './Core';
import { NodeTooltip } from './NodeTooltip';
import { OrbitNode } from './OrbitNode';
import { OrbitParticles } from './OrbitParticles';
import { OrbitRings } from './OrbitRings';
import { useActiveNode } from './hooks/useActiveNode';
import { useFitScale } from './hooks/useFitScale';
import { useInView } from './hooks/useInView';
import { useOrbitClock } from './hooks/useOrbitClock';
import { useReducedMotion } from './hooks/useReducedMotion';

export function OrbitSystem() {
  const { activeId, bind } = useActiveNode();
  const { ref: fitRef, fit: fitW } = useFitScale<HTMLDivElement>(SYSTEM_SIZE);

  // Height-based fit — uses window.innerHeight directly to avoid the
  // feedback loop that occurs when reading clientHeight of a scaled element.
  const [hFit, setHFit] = useState(1);
  useEffect(() => {
    const update = () => setHFit(Math.min(1, (window.innerHeight * 0.60) / SYSTEM_SIZE));
    update();
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, []);

  const fit = Math.min(fitW, hFit);
  const { ref: viewRef, inView } = useInView<HTMLDivElement>();
  const reducedMotion = useReducedMotion();

  const seconds = useOrbitClock(inView && !reducedMotion && activeId === null);

  const signals = PARTICLES.map((p) => ({
    id:   p.id,
    head: bodyAt(p, seconds, SIGNAL_SPEED),
    tail: bodyAt(p, Math.max(0, seconds - SIGNAL_TAIL_DT), SIGNAL_SPEED),
  }));
  const placedNodes = NODES.map((node) => ({ node, ...bodyAt(node, seconds) }));
  const activeNode  = placedNodes.find((p) => p.node.id === activeId);

  // Pulse 0..1 — matches GLSL burst formula in CoreShader.ts (same frequencies).
  // When reducedMotion or clock is paused, seconds=0 → raw may be non-zero but
  // we explicitly zero it out to keep the scene fully static.
  const rawBurst = PULSE_AMP_1 * Math.sin(seconds * PULSE_FREQ_1)
                 + PULSE_AMP_2 * Math.sin(seconds * PULSE_FREQ_2 + PULSE_PHASE_2);
  // 2-second fade-in prevents the initial flash from the non-zero burst at t=0
  // (burst formula evaluates to ~0.069 at t=0 due to PULSE_PHASE_2=2.10).
  const pulseFadeIn = Math.min(1, seconds / 2.0);
  const pulse = reducedMotion ? 0 : pulseFadeIn * Math.max(0, rawBurst) / (PULSE_AMP_1 + PULSE_AMP_2);

  // Ring opacity: base idle level + pulse contribution (dimmed overrides).
  const ringOpacity = activeId
    ? ORBIT_OPACITY.dimmed
    : ORBIT_OPACITY.idle + pulse * 0.06;

  return (
    <div
      ref={fitRef}
      className="orbit-fade-in flex min-w-0 max-h-[60vh] items-center justify-center"
    >
      <div
        ref={viewRef}
        style={{ width: SYSTEM_SIZE * fit, height: SYSTEM_SIZE * fit, overflow: 'hidden' }}
      >
        <div
          className="relative origin-top-left"
          style={{
            width: SYSTEM_SIZE,
            height: SYSTEM_SIZE,
            transform: `scale(${fit})`,
          }}
        >
          {/* Back layer — far halves of orbit rings + far-side particles */}
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
            style={{ zIndex: 0 }}
            viewBox={VIEWBOX}
            fill="none"
          >
            <OrbitRings part="back" opacity={ringOpacity} pulse={pulse} />
            <OrbitParticles items={signals} front={false} />
          </svg>

          <Core reducedMotion={reducedMotion} inView={inView} />

          {placedNodes.map(({ node, x, y, depth }) => (
            <OrbitNode
              key={node.id}
              node={node}
              x={x}
              y={y}
              depth={depth}
              isActive={activeId === node.id}
              isDimmed={activeId !== null && activeId !== node.id}
              handlers={bind(node.id)}
              pulse={pulse}
            />
          ))}

          {activeNode && (
            <NodeTooltip
              node={activeNode.node}
              x={activeNode.x}
              y={activeNode.y}
            />
          )}

          {/* Front layer — near halves of orbit rings + near-side particles */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
            style={{ zIndex: CORE_Z + 1 }}
            viewBox={VIEWBOX}
            fill="none"
          >
            <OrbitRings part="front" opacity={ringOpacity} pulse={pulse} />
            <OrbitParticles items={signals} front />
          </svg>
        </div>
      </div>
    </div>
  );
}
