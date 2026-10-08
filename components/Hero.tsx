'use client';

import { useEffect, useRef, useState } from 'react';

const SYSTEM_SIZE = 500;
const C = SYSTEM_SIZE / 2;

const ORBIT_DEPTH = 0.4; // сплюснутость орбиты (0..1)
const TILT = -12; // наклон плоскости орбит, градусы

const MIN_SCALE = 0.7;
const MAX_SCALE = 1.1;
const MIN_OPACITY = 0.35;
const MAX_OPACITY = 1;

const BASE_SPEED = 14; // град/сек на радиусе 100
const PARTICLE_FACTOR = 2.5;

const CORE_Z = 50;

type SystemNode = {
  id: string;
  label: string;
  angle: number;
  radius: number;
  description: string;
};

const nodes: SystemNode[] = [
  {
    id: 'ai',
    label: 'AI',
    angle: -70,
    radius: 100,
    description: 'LLM, agents, поиск и автоматизация решений.',
  },
  {
    id: 'api',
    label: 'API',
    angle: 20,
    radius: 220,
    description: 'Связываем сервисы и строим надёжные интеграции.',
  },
  {
    id: 'db',
    label: 'DB',
    angle: 110,
    radius: 100,
    description: 'Данные, хранение, обработка и аналитика.',
  },
  {
    id: 'int',
    label: 'INT',
    angle: 200,
    radius: 220,
    description: 'CRM, Telegram, платежи и внешние системы.',
  },
];

const orbitRadii = [100, 220];

const particles = [
  { id: 'p1', radius: 100, angle: -140 },
  { id: 'p2', radius: 220, angle: 40 },
  { id: 'p3', radius: 100, angle: -20 },
  { id: 'p4', radius: 220, angle: 160 },
];

// угловая скорость: внутренние орбиты быстрее
const orbitSpeed = (radius: number) => BASE_SPEED * Math.pow(100 / radius, 1.5);

const lerp = (min: number, max: number, t: number) => min + (max - min) * t;

const getPosition = (radius: number, angle: number) => {
  const rad = (angle * Math.PI) / 180;
  const tilt = (TILT * Math.PI) / 180;

  const ex = Math.cos(rad) * radius;
  const ey = Math.sin(rad) * radius * ORBIT_DEPTH;

  return {
    x: C + ex * Math.cos(tilt) - ey * Math.sin(tilt),
    y: C + ex * Math.sin(tilt) + ey * Math.cos(tilt),
    // 0 = дальняя точка орбиты, 1 = ближняя к зрителю
    depth: (Math.sin(rad) + 1) / 2,
  };
};

export default function Hero() {
  const [time, setTime] = useState(0); // мс
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const pausedRef = useRef(false);

  pausedRef.current = activeNode !== null;

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;

      if (!pausedRef.current) setTime((t) => t + dt);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const seconds = time / 1000;

  const particleItems = particles.map((p) => {
    const angle = p.angle + seconds * orbitSpeed(p.radius) * PARTICLE_FACTOR;
    return { ...p, ...getPosition(p.radius, angle) };
  });

  const renderParticles = (front: boolean) =>
    particleItems
      .filter((p) => p.depth >= 0.5 === front)
      .map((p) => (
        <circle
          key={p.id}
          cx={p.x}
          cy={p.y}
          r={lerp(1, 2.4, p.depth)}
          fill="white"
          opacity={lerp(0.15, 0.8, p.depth)}
        />
      ));

  const orbitOpacity = activeNode ? 0.03 : 0.08;

  return (
    <section className="relative flex min-h-[calc(100vh-89px)] items-center py-20">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="mb-6 text-sm uppercase tracking-[0.2em] text-white/40">
            Engineering studio / 2026
          </p>

          <h1 className="text-5xl font-semibold leading-tight tracking-tight md:text-7xl">
            Берём задачу
            <br />
            и превращаем её
            <br />в работающий продукт.
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-white/50">
            Разрабатываем цифровые продукты, автоматизируем процессы и
            подключаем AI там, где он действительно приносит пользу.
          </p>

          <button className="mt-10 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/80">
            Обсудить задачу
          </button>
        </div>

        <div className="flex min-h-[520px] items-center justify-center">
          <div
            className="relative"
            style={{ width: SYSTEM_SIZE, height: SYSTEM_SIZE }}
          >
            {/* ЗАДНИЙ слой: орбиты целиком + дальние частицы */}
            <svg
              className="absolute inset-0 h-full w-full"
              style={{ zIndex: 0 }}
              viewBox={`0 0 ${SYSTEM_SIZE} ${SYSTEM_SIZE}`}
              fill="none"
            >
              <g transform={`rotate(${TILT} ${C} ${C})`}>
                {orbitRadii.map((r) => (
                  <ellipse
                    key={r}
                    cx={C}
                    cy={C}
                    rx={r}
                    ry={r * ORBIT_DEPTH}
                    stroke="white"
                    strokeOpacity={orbitOpacity}
                    className="transition-all duration-300"
                  />
                ))}
              </g>
              {renderParticles(false)}
            </svg>

            {/* ЯДРО */}
            <div
              className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#0a0a0a] shadow-[0_0_60px_rgba(255,255,255,0.08)]"
              style={{ zIndex: CORE_Z }}
            >
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                  Core
                </div>
                <div className="mt-1 text-lg font-medium">Product</div>
              </div>
            </div>

            {/* НОДЫ */}
            {nodes.map((node) => {
              const angle = node.angle + seconds * orbitSpeed(node.radius);
              const { x, y, depth } = getPosition(node.radius, angle);

              const isActive = activeNode === node.id;
              const isDimmed = activeNode !== null && !isActive;

              const scale = lerp(MIN_SCALE, MAX_SCALE, depth);
              const opacity = isActive
                ? 1
                : lerp(MIN_OPACITY, MAX_OPACITY, depth);

              // depth < 0.5 -> за ядром, > 0.5 -> перед ядром
              const zIndex = isActive ? 200 : Math.round(depth * CORE_Z * 2);

              return (
                <div
                  key={node.id}
                  className="absolute"
                  style={{
                    left: x,
                    top: y,
                    zIndex,
                    opacity,
                    transform: `translate(-50%, -50%) scale(${scale})`,
                  }}
                  onMouseEnter={() => setActiveNode(node.id)}
                  onMouseLeave={() => setActiveNode(null)}
                >
                  {/* hover-анимации живут отдельно от анимации орбиты */}
                  <div
                    className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border bg-[#0a0a0a] text-xs transition-[transform,opacity,border-color,box-shadow] duration-300"
                    style={{
                      transform: isActive ? 'scale(1.2)' : 'scale(1)',
                      opacity: isDimmed ? 0.3 : 1,
                      borderColor: isActive
                        ? 'rgba(255,255,255,0.7)'
                        : 'rgba(255,255,255,0.2)',
                      boxShadow: isActive
                        ? '0 0 30px rgba(255,255,255,0.15)'
                        : 'none',
                    }}
                  >
                    {node.label}
                  </div>

                  {isActive && (
                    <div className="absolute left-1/2 top-full mt-4 w-52 -translate-x-1/2 rounded-xl border border-white/10 bg-black/80 p-3 text-left text-xs text-white/60 shadow-2xl backdrop-blur-md">
                      <div className="mb-1 font-medium text-white">
                        {node.label}
                      </div>
                      <div>{node.description}</div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* ПЕРЕДНИЙ слой: ближние частицы + передняя половина орбит */}
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              style={{ zIndex: CORE_Z + 1 }}
              viewBox={`0 0 ${SYSTEM_SIZE} ${SYSTEM_SIZE}`}
              fill="none"
            >
              <g transform={`rotate(${TILT} ${C} ${C})`}>
                {orbitRadii.map((r) => (
                  <path
                    key={r}
                    d={`M ${C - r} ${C} A ${r} ${r * ORBIT_DEPTH} 0 0 0 ${C + r} ${C}`}
                    stroke="white"
                    strokeOpacity={orbitOpacity}
                    className="transition-all duration-300"
                  />
                ))}
              </g>
              {renderParticles(true)}
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
