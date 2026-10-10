import type { OrbitId, Particle, SystemNode } from './types';

// --- Геометрия сцены ---
export const SYSTEM_SIZE = 500;
export const CENTER = SYSTEM_SIZE / 2;
export const VIEWBOX = `0 0 ${SYSTEM_SIZE} ${SYSTEM_SIZE}`;

export const ORBIT_DEPTH = 0.4; // сплюснутость орбиты (0..1)
export const TILT_DEG = -12; // наклон плоскости орбит

export const ORBITS = {
  inner: { radius: 100 },
  outer: { radius: 220 },
} satisfies Record<OrbitId, { radius: number }>;

// --- Глубина ---
/** depth >= FRONT_DEPTH — тело находится перед ядром */
export const FRONT_DEPTH = 0.5;

export const MIN_SCALE = 0.7;
export const MAX_SCALE = 1.1;
export const MIN_OPACITY = 0.35;
export const MAX_OPACITY = 1;

// --- z-index слои ---
export const CORE_Z = 50;
export const ACTIVE_NODE_Z = 200;
export const TOOLTIP_Z = 300;

// --- Анимация ---
export const BASE_SPEED = 14; // град/сек на внутренней орбите
export const PARTICLE_FACTOR = 2.5;
export const MAX_FRAME_MS = 50; // защита от скачка после возврата на вкладку

// --- Размеры UI ---
export const NODE_SIZE = 48;
export const TOOLTIP_WIDTH = 208;
export const TOOLTIP_OFFSET = 44; // от центра ноды до верха подсказки

export const ORBIT_OPACITY = { idle: 0.08, dimmed: 0.03 } as const;

// --- Данные ---
export const NODES: readonly SystemNode[] = [
  {
    id: 'ai',
    label: 'AI',
    orbit: 'inner',
    startAngle: -70,
    description: 'LLM, agents, поиск и автоматизация решений.',
  },
  {
    id: 'api',
    label: 'API',
    orbit: 'outer',
    startAngle: 20,
    description: 'Связываем сервисы и строим надёжные интеграции.',
  },
  {
    id: 'db',
    label: 'DB',
    orbit: 'inner',
    startAngle: 110,
    description: 'Данные, хранение, обработка и аналитика.',
  },
  {
    id: 'int',
    label: 'INT',
    orbit: 'outer',
    startAngle: 200,
    description: 'CRM, Telegram, платежи и внешние системы.',
  },
];

export const PARTICLES: readonly Particle[] = [
  { id: 'p1', orbit: 'inner', startAngle: -140 },
  { id: 'p2', orbit: 'outer', startAngle: 40 },
  { id: 'p3', orbit: 'inner', startAngle: -20 },
  { id: 'p4', orbit: 'outer', startAngle: 160 },
];
