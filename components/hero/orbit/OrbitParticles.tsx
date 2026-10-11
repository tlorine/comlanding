import { memo } from 'react';
import { isFront, lerp } from './math';
import type { Projected } from './types';

/** Сигнал: позиция головы и хвоста — из них строится градиентный комет */
export type SignalItem = {
  id: string;
  head: Projected;
  tail: Projected;
};

type Props = {
  items: SignalItem[];
  front: boolean;
};

export const OrbitParticles = memo(function OrbitParticles({
  items,
  front,
}: Props) {
  const visible = items.filter((item) => isFront(item.head.depth) === front);
  if (visible.length === 0) return null;

  // Signal colour: cold steel-blue, slightly brighter for legibility
  const SIG_COLOR = 'rgb(115,165,210)';

  return (
    <>
      <defs>
        {visible.map(({ id, head, tail }) => (
          <linearGradient
            key={id}
            id={`sig-${id}-${front ? 'f' : 'b'}`}
            x1={tail.x}
            y1={tail.y}
            x2={head.x}
            y2={head.y}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={SIG_COLOR} stopOpacity={0} />
            <stop offset="100%" stopColor={SIG_COLOR} stopOpacity={lerp(0.16, 0.55, head.depth)} />
          </linearGradient>
        ))}
      </defs>
      {visible.map(({ id, head, tail }) => (
        <g key={id}>
          <line
            x1={tail.x}
            y1={tail.y}
            x2={head.x}
            y2={head.y}
            stroke={`url(#sig-${id}-${front ? 'f' : 'b'})`}
            strokeWidth={lerp(0.5, 1.5, head.depth)}
            strokeLinecap="round"
          />
          <circle
            cx={head.x}
            cy={head.y}
            r={lerp(0.8, 1.9, head.depth)}
            fill={SIG_COLOR}
            opacity={lerp(0.22, 0.68, head.depth)}
          />
        </g>
      ))}
    </>
  );
});
