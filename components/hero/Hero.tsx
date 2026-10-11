import { ContactCta } from '../contact/ContactCta';
import { HERO_CONTENT } from './hero.content';
import { GridBackground } from './GridBackground';
import { OrbitSystem } from './orbit/OrbitSystem';

// Серверный компонент: текст не попадает в клиентский бандл.
// Высоту шапки задайте в layout: :root { --header-h: 89px }
export default function Hero() {
  const { title, description, cta } = HERO_CONTENT;

  return (
    <section className="relative isolate flex items-center py-12 lg:py-16">
      <GridBackground />
      <div className="grid min-w-0 w-full grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div className="min-w-0">
          <h1 className="text-balance break-words text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
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
