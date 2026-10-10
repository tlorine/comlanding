import { ContactCta } from '../contact/ContactCta';
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
          <h1 className="text-balance text-5xl font-semibold leading-tight tracking-tight md:text-7xl">
            {title}
          </h1>

          <p className="mt-8 max-w-xl text-lg leading-relaxed text-white/50">
            {description}
          </p>

          <ContactCta className="mt-10">{cta.label}</ContactCta>
        </div>

        <OrbitSystem />
      </div>
    </section>
  );
}
