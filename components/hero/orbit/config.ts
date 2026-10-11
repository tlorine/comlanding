import type { OrbitId, Particle, SystemNode } from './types';

// --- Геометрия сцены ---
export const SYSTEM_SIZE = 610;
export const CENTER = SYSTEM_SIZE / 2;
export const VIEWBOX = `0 0 ${SYSTEM_SIZE} ${SYSTEM_SIZE}`;

export const ORBIT_DEPTH = 0.4; // сплюснутость орбиты (0..1)
export const TILT_DEG = -12; // наклон плоскости орбит

export const ORBITS = {
  inner: { radius: 144 },
  outer: { radius: 268 },
} satisfies Record<OrbitId, { radius: number }>;

// --- Глубина ---
/** depth >= FRONT_DEPTH — тело находится перед ядром */
export const FRONT_DEPTH = 0.5;

export const MIN_SCALE = 0.72;
export const MAX_SCALE = 1.05;
export const MIN_OPACITY = 0.36;
export const MAX_OPACITY = 1;

// --- z-index слои ---
export const CORE_Z = 50;
export const ACTIVE_NODE_Z = 200;
export const TOOLTIP_Z = 300;

// --- Размеры ядра ---
// 256px canvas: sphere Ø179px fills ~70% of canvas (r=46 at camera z=155, fov=46).
// Inner orbit r=144 → ring extends ~13px beyond core canvas edge; z-ordering handles overlap.
export const CORE_SIZE    = 256; // диаметр Three.js-канваса центрального ядра
// Downward offset from geometric CENTER — corrects optical high-center illusion:
// the near (bottom) orbit arc is 2.6× brighter, pulling visual weight below centre.
export const CORE_Y_OFFSET = 15; // scene units

// --- Анимация ---
export const BASE_SPEED   = 9;   // град/сек на внутренней орбите
export const MAX_FRAME_MS = 50;  // защита от скачка после возврата на вкладку

// Органическая вариативность скорости
export const WOBBLE_AMP  = 2.5;  // чуть менее хаотично
export const WOBBLE_FREQ = 0.25; // рад/с → период ≈ 25 с

// Сигналы — движущиеся точки с градиентным хвостом
export const SIGNAL_SPEED   = 2.2;  // множитель скорости относительно BASE_SPEED
export const SIGNAL_TAIL_DT = 0.4;  // секунд «позади» головы сигнала

// --- Размеры UI ---
export const NODE_SIZE = 56; // диаметр кнопки узла
export const TOOLTIP_WIDTH = 208;
export const TOOLTIP_OFFSET = 44; // от центра ноды до верха подсказки

export const ORBIT_OPACITY = { idle: 0.14, dimmed: 0.05 } as const;

// --- Пульсация ядра ---
// Два близких нечётных частотных отношения (0.52 / 0.91 ≈ 1:1.75) создают
// нерегулярные пики — органичный ритм без метрономичности.
// Эти константы использует и CoreShader.ts (GLSL), и JS-сторона (OrbitSystem).
// При изменении здесь обязательно синхронизировать GLSL в CoreShader.ts.
export const PULSE_FREQ_1  = 0.52;   // рад/с (~12.1 с период)
export const PULSE_FREQ_2  = 0.91;   // рад/с (~6.9 с период)
export const PULSE_AMP_1   = 0.07;   // амплитуда первой гармоники
export const PULSE_AMP_2   = 0.04;   // амплитуда второй гармоники
export const PULSE_PHASE_2 = 2.10;   // фазовое смещение второй гармоники (рад)
// Приблизительная максимальная амплитуда суммы: PULSE_AMP_1 + PULSE_AMP_2 = 0.11

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
