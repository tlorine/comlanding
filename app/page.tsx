import ServiceCard from '@/components/ServiceCard';
import Header from '@/components/Header';
import Hero from '@/components/hero/Hero';
import { SERVICES_CONTENT } from '@/components/services.content';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] px-6 pb-16 text-white">
      <Header />
      <Hero />

      <section aria-labelledby="services-title">
        <div className="mb-10 flex items-end justify-between gap-4">
          <h2 id="services-title" className="text-4xl font-bold">
            {SERVICES_CONTENT.title}
          </h2>

          <span className="shrink-0 text-sm text-white/40">
            {SERVICES_CONTENT.meta}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SERVICES_CONTENT.items.map((item) => (
            <ServiceCard key={item.number} {...item} />
          ))}
        </div>
      </section>
    </main>
  );
}
