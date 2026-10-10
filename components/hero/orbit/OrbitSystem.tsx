'use client';

import {
  CORE_Z,
  NODES,
  ORBIT_OPACITY,
  PARTICLES,
  PARTICLE_FACTOR,
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
  const { ref: fitRef, fit } = useFitScale<HTMLDivElement>(SYSTEM_SIZE);
  const { ref: viewRef, inView } = useInView<HTMLDivElement>();
  const reducedMotion = useReducedMotion();

  // анимация идёт, только если сцена видна, нет reduced-motion и не открыта подсказка
  const seconds = useOrbitClock(inView && !reducedMotion && activeId === null);

  const particles = PARTICLES.map((p) => ({
    id: p.id,
    ...bodyAt(p, seconds, PARTICLE_FACTOR),
  }));
  const placedNodes = NODES.map((node) => ({ node, ...bodyAt(node, seconds) }));
  const activeNode = placedNodes.find((p) => p.node.id === activeId);

  const ringOpacity = activeId ? ORBIT_OPACITY.dimmed : ORBIT_OPACITY.idle;

  return (
    <div
      ref={fitRef}
      className="flex min-w-0 items-center justify-center lg:min-h-[520px]"
    >
      {/* блок занимает в потоке уже уменьшенный размер */}
      <div
        ref={viewRef}
        style={{ width: SYSTEM_SIZE * fit, height: SYSTEM_SIZE * fit }}
      >
        {/* сама сцена масштабируется от левого верхнего угла */}
        <div
          className="relative origin-top-left"
          style={{
            width: SYSTEM_SIZE,
            height: SYSTEM_SIZE,
            transform: `scale(${fit})`,
          }}
        >
          {/* ЗАДНИЙ слой: дальняя половина орбит + дальние частицы */}
          <svg
            aria-hidden="true"
            className="absolute inset-0 h-full w-full"
            style={{ zIndex: 0 }}
            viewBox={VIEWBOX}
            fill="none"
          >
            <OrbitRings part="back" opacity={ringOpacity} />
            <OrbitParticles items={particles} front={false} />
          </svg>

          <Core />

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
            />
          ))}

          {activeNode && (
            <NodeTooltip
              node={activeNode.node}
              x={activeNode.x}
              y={activeNode.y}
            />
          )}

          {/* ПЕРЕДНИЙ слой: ближняя половина орбит + ближние частицы */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
            style={{ zIndex: CORE_Z + 1 }}
            viewBox={VIEWBOX}
            fill="none"
          >
            <OrbitRings part="front" opacity={ringOpacity} />
            <OrbitParticles items={particles} front />
          </svg>
        </div>
      </div>
    </div>
  );
}