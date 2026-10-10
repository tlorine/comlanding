import { memo } from 'react';
import { isFront, lerp } from './math';
import type { Projected } from './types';

type Item = Projected & { id: string };

type Props = {
  items: Item[];
  front: boolean;
};

export const OrbitParticles = memo(function OrbitParticles({
  items,
  front,
}: Props) {
  return (
    <>
      {items
        .filter((p) => isFront(p.depth) === front)
        .map((p) => (
          <circle
            key={p.id}
            cx={p.x}
            cy={p.y}
            r={lerp(1, 2.4, p.depth)}
            fill="white"
            opacity={lerp(0.15, 0.8, p.depth)}
          />
        ))}
    </>
  );
});
