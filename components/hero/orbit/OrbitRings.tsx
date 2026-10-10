import { memo } from 'react';
import { CENTER, ORBIT_DEPTH, ORBITS, TILT_DEG } from './config';

type Props = {
  /** back — дальняя (верхняя) половина, front — ближняя (нижняя) */
  part: 'back' | 'front';
  opacity: number;
};

export const OrbitRings = memo(function OrbitRings({ part, opacity }: Props) {
  // sweep-flag: 1 — верхняя половина эллипса, 0 — нижняя
  const sweep = part === 'back' ? 1 : 0;

  return (
    <g transform={`rotate(${TILT_DEG} ${CENTER} ${CENTER})`}>
      {Object.values(ORBITS).map(({ radius: r }) => (
        <path
          key={r}
          d={`M ${CENTER - r} ${CENTER} A ${r} ${r * ORBIT_DEPTH} 0 0 ${sweep} ${CENTER + r} ${CENTER}`}
          stroke="white"
          strokeOpacity={opacity}
          style={{ transition: 'stroke-opacity 300ms' }}
        />
      ))}
    </g>
  );
});