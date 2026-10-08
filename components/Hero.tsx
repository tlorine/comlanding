"use client"

import { useEffect, useState } from "react"

const SYSTEM_SIZE = 320
const SYSTEM_CENTER = SYSTEM_SIZE / 2

const MIN_NODE_SCALE = 0.8
const MAX_NODE_SCALE = 1.2

const MIN_NODE_OPACITY = 0.45
const MAX_NODE_OPACITY = 1

const PARTICLE_SPEED = 1
const NODES_SPEED = 0.3

const ORBIT_DEPTH = 0.65

type SystemNode = {
  id: string
  label: string
  angle: number
  radius: number
  description: string
}

const nodes: SystemNode[] = [
  {
    id: "ai",
    label: "AI",
    angle: -70,
    radius: 100,
    description: "LLM, agents, поиск и автоматизация решений.",
  },
  {
    id: "api",
    label: "API",
    angle: 20,
    radius: 100,
    description: "Связываем сервисы и строим надёжные интеграции.",
  },
  {
    id: "db",
    label: "DB",
    angle: 110,
    radius: 160,
    description: "Данные, хранение, обработка и аналитика.",
  },
  {
    id: "int",
    label: "INT",
    angle: 200,
    radius: 160,
    description: "CRM, Telegram, платежи и внешние системы.",
  },
]

const orbitRadii = [100, 160]

type OrbitParticle = {
  id: string
  radius: number
  angle: number
}

const particles: OrbitParticle[] = [
  { id: "p1", radius: 100, angle: -140 },
  { id: "p2", radius: 100, angle: 40 },
  { id: "p3", radius: 160, angle: -20 },
  { id: "p4", radius: 160, angle: 160 },
]

const getPosition = (radius: number, angle: number) => {
  const radians = (angle * Math.PI) / 180

  return {
    x:
      SYSTEM_CENTER +
      Math.cos(radians) * radius,

    y:
      SYSTEM_CENTER +
      Math.sin(radians) * radius * ORBIT_DEPTH,
  }
}

const getDepth = (y: number) => {
  return y / SYSTEM_SIZE
}

const getNodeScale = (depth: number) => {
  return (
    MIN_NODE_SCALE +
    depth * (MAX_NODE_SCALE - MIN_NODE_SCALE)
  )
}

const getNodeOpacity = (depth: number) => {
  return (
    MIN_NODE_OPACITY +
    depth * (MAX_NODE_OPACITY - MIN_NODE_OPACITY)
  )
}

export default function Hero() {
  const [nodeAngles, setNodeAngles] = useState(
    nodes.map((node) => node.angle),
  )

  const [particleAngles, setParticleAngles] = useState(
    particles.map((particle) => particle.angle),
  )

  const [activeNode, setActiveNode] = useState<string | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setNodeAngles((angles) =>
        angles.map((angle) => angle + NODES_SPEED),
      )

      setParticleAngles((angles) =>
        angles.map((angle) => angle + PARTICLE_SPEED),
      )
    }, 30)

    return () => clearInterval(interval)
  }, [])

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
            <br />
            в работающий продукт.
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-white/50">
            Разрабатываем цифровые продукты, автоматизируем процессы и
            подключаем AI там, где он действительно приносит пользу.
          </p>

          <button className="mt-10 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/80">
            Обсудить задачу
          </button>
        </div>

        <div className="flex min-h-[400px] items-center justify-center">
          <div className="relative h-80 w-80">
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox={`0 0 ${SYSTEM_SIZE} ${SYSTEM_SIZE}`}
              fill="none"
            >
              {orbitRadii.map((radius) => (
                <ellipse
                  key={radius}
                  cx={SYSTEM_CENTER}
                  cy={SYSTEM_CENTER}
                  rx={radius}
                  ry={radius * ORBIT_DEPTH}
                  stroke="white"
                  strokeOpacity={
                    activeNode ? "0.03" : "0.06"
                  }
                  fill="none"
                  className="transition-all duration-300"
                />
              ))}

              {particles.map((particle, index) => {
                const position = getPosition(
                  particle.radius,
                  particleAngles[index],
                )

                return (
                  <circle
                    key={particle.id}
                    cx={position.x}
                    cy={position.y}
                    r="2"
                    fill="white"
                    opacity="0.6"
                  />
                )
              })}
            </svg>

            <div className="absolute left-1/2 top-1/2 flex h-21 w-21 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/5 shadow-[0_0_60px_rgba(255,255,255,0.05)]">
              <div className="text-center">
                <div className="text-xs uppercase tracking-[0.2em] text-white/40">
                  Core
                </div>

                <div className="mt-2 text-lg font-medium">
                  Product
                </div>
              </div>
            </div>

            {nodes.map((node, index) => {
              const position = getPosition(
                node.radius,
                nodeAngles[index],
              )

              const depth = getDepth(position.y)
              const baseScale = getNodeScale(depth)
              const baseOpacity = getNodeOpacity(depth)

              const isActive = activeNode === node.id
              const isDimmed =
                activeNode !== null && !isActive

              const scale = isActive
                ? baseScale * 1.2
                : baseScale

              const opacity = isDimmed
                ? baseOpacity * 0.25
                : baseOpacity

              return (
                <div
                  key={node.id}
                  className="absolute flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border bg-white/5 text-xs transition-[transform,opacity,border-color,box-shadow] duration-300"
                  style={{
                    left: position.x,
                    top: position.y,
                    transform: `translate(-50%, -50%) scale(${scale})`,
                    opacity,
                    zIndex: Math.round(position.y),
                    borderColor: isActive
                      ? "rgba(255,255,255,0.7)"
                      : "rgba(255,255,255,0.2)",
                    boxShadow: isActive
                      ? "0 0 30px rgba(255,255,255,0.15)"
                      : "none",
                  }}
                  onMouseEnter={() => setActiveNode(node.id)}
                  onMouseLeave={() => setActiveNode(null)}
                >
                  {node.label}

                  {isActive && (
                    <div className="absolute left-1/2 top-full mt-4 w-52 -translate-x-1/2 rounded-xl border border-white/10 bg-black/80 p-3 text-left text-xs text-white/60 shadow-2xl backdrop-blur-md">
                      <div className="mb-1 font-medium text-white">
                        {node.label}
                      </div>

                      <div>{node.description}</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
