import ServiceCard from '@/components/ServiceCard';
import Header from '@/components/Header';
import Hero from '@/components/hero/Hero';
import { SERVICES_CONTENT } from '@/components/services.content';
import { PROCESS_CONTENT } from '@/components/process.content';
import { ScrollNext } from '@/components/ScrollNext';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] px-6 pb-24 text-white">
      {/* Viewport-filling wrapper: Header + Hero stack to exactly 100dvh */}
      <div className="flex min-h-dvh flex-col">
        <Header />
        <Hero />
      </div>

      {/* ── Visual transition: subtle gradient rule between Hero and Services ── */}
      <div
        aria-hidden="true"
        className="mt-8 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent"
      />

      {/* ── Services ─────────────────────────────────────────────────────────── */}
      <section
        id="services"
        aria-labelledby="services-title"
        className="relative flex min-h-dvh flex-col justify-center pt-10 pb-16 lg:pt-12"
      >
        {/* Atmospheric blue tint — purely decorative, no JS */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-72"
          style={{ background: 'radial-gradient(ellipse 85% 100% at 68% 0%, rgba(22,58,158,0.08) 0%, transparent 100%)' }}
        />
        {/* Section label: number / category */}
        <div className="mb-12 flex items-center gap-3 lg:mb-14">
          <span className="font-mono text-[11px] tracking-[0.22em] text-white/25 uppercase">
            {SERVICES_CONTENT.sectionNumber}
          </span>
          <span aria-hidden="true" className="inline-block h-px w-5 bg-white/15" />
          <span className="font-mono text-[11px] tracking-[0.22em] text-white/25 uppercase">
            {SERVICES_CONTENT.sectionLabel}
          </span>
        </div>

        {/* Asymmetric layout: heading + lead on the left, cards on the right.
            On mobile and tablet the two areas stack vertically.
            At lg (1024px+) heading is fixed-width left column.
            At xl (1280px+) cards switch from 2×2 to 4×1. */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[260px_1fr] lg:gap-12 xl:grid-cols-[300px_1fr]">

          {/* Left: heading + lead */}
          <div>
            <h2
              id="services-title"
              className="text-balance text-3xl font-bold leading-tight tracking-tight lg:text-4xl"
            >
              {SERVICES_CONTENT.heading}
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-white/40">
              {SERVICES_CONTENT.lead}
            </p>
          </div>

          {/* Right: cards grid
              sm  (640px+): 2 columns
              xl (1280px+): 4 columns */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {SERVICES_CONTENT.items.map((item) => (
              <ServiceCard key={item.number} {...item} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Process ──────────────────────────────────────────────────────────── */}
      <section
        id="process"
        aria-labelledby="process-title"
        className="flex min-h-dvh flex-col justify-center pt-16 pb-24 lg:pt-20"
      >
        {/* Section label */}
        <div className="mb-12 flex items-center gap-3 lg:mb-14">
          <span className="font-mono text-[11px] tracking-[0.22em] text-white/25 uppercase">
            {PROCESS_CONTENT.sectionNumber}
          </span>
          <span aria-hidden="true" className="inline-block h-px w-5 bg-white/15" />
          <span className="font-mono text-[11px] tracking-[0.22em] text-white/25 uppercase">
            {PROCESS_CONTENT.sectionLabel}
          </span>
        </div>

        <h2
          id="process-title"
          className="mb-12 max-w-lg text-balance text-3xl font-bold leading-tight tracking-tight lg:text-4xl"
        >
          {PROCESS_CONTENT.heading}
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PROCESS_CONTENT.steps.map((step) => (
            <div key={step.number} className="flex flex-col gap-3 border-t border-white/8 pt-5">
              <span className="font-mono text-xs tracking-[0.18em] text-white/25">{step.number}</span>
              <h3 className="text-base font-semibold leading-snug">{step.title}</h3>
              <p className="text-sm leading-relaxed text-white/45">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <ScrollNext />
    </main>
  );
}
