import { memo } from 'react';
import { CENTER, CORE_Y_OFFSET, ORBIT_DEPTH, ORBITS, TILT_DEG } from './config';
import { isFront, orbitPoint } from './math';
import type { OrbitId } from './types';

type Props = {
  /** back — дальняя (верхняя) половина, front — ближняя (нижняя) */
  part: 'back' | 'front';
  opacity: number;
  /** 0..1 — Core burst level; drives radial illumination overlay on front arc */
  pulse: number;
};

// Кардинальные точки орбиты: 0° право, 90° низ (ближний), 180° лево, 270° верх (дальний)
const TICK_ANGLES = [0, 90, 180, 270] as const;

// Front arc is significantly brighter than the back — this is the primary
// depth cue for the whole orbit system. A weak front/back split makes the
// system read as a flat diagram; a strong split reads as a 3D torus.
const FRONT_MULT = 2.6;
const BACK_MULT  = 0.40;

// Slightly lighter/brighter than before — rings must be visible at idle
// opacity 0.14 * FRONT_MULT = 0.364 max for front arc.
const RING_COLOR  = 'rgb(125,152,188)';
const GHOST_COLOR = 'rgb(90,118,158)';

export const OrbitRings = memo(function OrbitRings({ part, opacity, pulse }: Props) {
  const sweep = part === 'back' ? 1 : 0;
  const arcMult = part === 'front' ? FRONT_MULT : BACK_MULT;
  const orbitIds = Object.keys(ORBITS) as OrbitId[];

  return (
    <>
      <defs>
        {/* Arc endpoint fade gradients — one per orbit per part.
            Fades each half-arc's stroke to transparent at both endpoints
            (the equatorial crossing points where front and back halves meet).
            Eliminates the hard opacity seam between FRONT_MULT and BACK_MULT zones.
            gradientUnits="userSpaceOnUse" → coordinates are in the rotated space
            of the referencing path, so x1/x2 correctly align with arc endpoints. */}
        {Object.values(ORBITS).map(({ radius: r }) => (
          <linearGradient
            key={r}
            id={`orbit-fade-${r}-${part}`}
            x1={CENTER - r}
            y1={CENTER}
            x2={CENTER + r}
            y2={CENTER}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%"   stopColor={RING_COLOR} stopOpacity={0} />
            <stop offset="9%"   stopColor={RING_COLOR} stopOpacity={1} />
            <stop offset="91%"  stopColor={RING_COLOR} stopOpacity={1} />
            <stop offset="100%" stopColor={RING_COLOR} stopOpacity={0} />
          </linearGradient>
        ))}
        {/* Pulse illumination radial gradient — front arc only */}
        {part === 'front' && (
          <radialGradient
            id="ring-core-pulse"
            cx={CENTER}
            cy={CENTER + CORE_Y_OFFSET}
            r={220}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%"   stopColor="rgb(100,170,255)" stopOpacity={pulse * 0.65} />
            <stop offset="55%"  stopColor="rgb(100,170,255)" stopOpacity={pulse * 0.20} />
            <stop offset="100%" stopColor="rgb(100,170,255)" stopOpacity={0} />
          </radialGradient>
        )}
      </defs>

      {/* Tilted ring paths */}
      <g transform={`rotate(${TILT_DEG} ${CENTER} ${CENTER})`}>
        {Object.values(ORBITS).map(({ radius: r }) => (
          <g key={r} fill="none">
            {/* Призрачная полная орбита — только в заднем слое */}
            {part === 'back' && (
              <path
                d={`M ${CENTER - r} ${CENTER} A ${r} ${r * ORBIT_DEPTH} 0 0 1 ${CENTER + r} ${CENTER} A ${r} ${r * ORBIT_DEPTH} 0 0 1 ${CENTER - r} ${CENTER}`}
                stroke={GHOST_COLOR}
                strokeWidth={0.4}
                strokeOpacity={0.07}
              />
            )}
            {/* Основная полудуга — gradient handles endpoint fade,
                strokeOpacity handles front/back brightness ratio */}
            <path
              d={`M ${CENTER - r} ${CENTER} A ${r} ${r * ORBIT_DEPTH} 0 0 ${sweep} ${CENTER + r} ${CENTER}`}
              stroke={`url(#orbit-fade-${r}-${part})`}
              strokeWidth={0.85}
              strokeOpacity={Math.min(opacity * arcMult, 1)}
              style={{ transition: 'stroke-opacity 300ms' }}
            />
            {/* Pulse illumination overlay — front arc only.
                Spatially correct: inner arc near Core glows brightest.
                Outer arc gets ~33% of inner brightness at r=268 vs r=144. */}
            {part === 'front' && pulse > 0.01 && (
              <path
                d={`M ${CENTER - r} ${CENTER} A ${r} ${r * ORBIT_DEPTH} 0 0 0 ${CENTER + r} ${CENTER}`}
                stroke="url(#ring-core-pulse)"
                strokeWidth={2.5}
              />
            )}
          </g>
        ))}
      </g>

      {/* Маркеры кардинальных точек */}
      {orbitIds.flatMap((id) =>
        TICK_ANGLES
          .map((deg) => ({ deg, ...orbitPoint(id, deg) }))
          .filter(({ depth }) => isFront(depth) === (part === 'front'))
          .map(({ deg, x, y }) => (
            <circle
              key={`${id}-${deg}`}
              cx={x}
              cy={y}
              r={1.3}
              fill={RING_COLOR}
              fillOpacity={Math.min(opacity * arcMult, 0.30)}
            />
          ))
      )}
    </>
  );
});
