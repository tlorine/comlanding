import {
  ACTIVE_NODE_Z,
  BASE_SPEED,
  CENTER,
  CORE_Z,
  FRONT_DEPTH,
  ORBIT_DEPTH,
  ORBITS,
  TILT_DEG,
} from './config';
import type { Body, Projected } from './types';

// Должен совпадать с rotate(TILT_DEG) в OrbitRings
const TILT = (TILT_DEG * Math.PI) / 180;
const COS = Math.cos(TILT);
const SIN = Math.sin(TILT);

const REF_RADIUS = ORBITS.inner.radius;

export const lerp = (min: number, max: number, t: number) =>
  min + (max - min) * t;

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export const isFront = (depth: number) => depth >= FRONT_DEPTH;

/** Угловая скорость (град/сек): внутренние орбиты быстрее */
export const orbitSpeed = (radius: number) =>
  BASE_SPEED * Math.pow(REF_RADIUS / radius, 1.5);

/** Позиция тела на сцене через `seconds` секунд после старта */
export function bodyAt(
  body: Body,
  seconds: number,
  speedFactor = 1,
): Projected {
  const radius = ORBITS[body.orbit].radius;
  const angle = body.startAngle + seconds * orbitSpeed(radius) * speedFactor;
  const rad = (angle * Math.PI) / 180;

  const ex = Math.cos(rad) * radius;
  const ey = Math.sin(rad) * radius * ORBIT_DEPTH;

  return {
    x: CENTER + ex * COS - ey * SIN,
    y: CENTER + ex * SIN + ey * COS,
    depth: (Math.sin(rad) + 1) / 2,
  };
}

/** Активная нода всегда сверху, остальные раскладываются вокруг ядра */
export const nodeZIndex = (depth: number, isActive: boolean) =>
  isActive ? ACTIVE_NODE_Z : Math.round(depth * CORE_Z * 2);
