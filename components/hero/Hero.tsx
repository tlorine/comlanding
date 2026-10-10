import { HERO_CONTENT } from './hero.content';
import { OrbitSystem } from './orbit/OrbitSystem';

// Серверный компонент: текст не попадает в клиентский бандл.
// Высоту шапки задайте в layout: :root { --header-h: 89px }
export default function Hero() {
  const { eyebrow, title, description, cta } = HERO_CONTENT;

  return (
    <section className="relative flex min-h-[calc(100svh-var(--header-h,89px))] items-center py-20">
      <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="mb-6 text-sm uppercase tracking-[0.2em] text-white/40">
            {eyebrow}
          </p>

          <h1 className="text-balance text-5xl font-semibold leading-tight tracking-tight md:text-7xl">
            {title}
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-white/50">
            {description}
          </p>

          <a
            href={cta.href}
            className="mt-10 inline-block rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/80"
          >
            {cta.label}
          </a>
        </div>

        <OrbitSystem />
      </div>
    </section>
  );
}