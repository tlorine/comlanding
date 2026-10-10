import ServiceCard from '@/components/ServiceCard';
import Header from '@/components/Header';
import Hero from '@/components/hero/Hero';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] px-6 py-16 text-white">
      <Header />
      <Hero />
      <div className="mb-10 flex items-end justify-between">
        <h1 className="text-4xl font-bold">Моя студия разработки</h1>

        <span className="text-sm text-white/40">2026 / Yerevan</span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ServiceCard
          number="01"
          title="Разработка"
          description="Создаём цифровые продукты с нуля."
        />

        <ServiceCard
          number="02"
          title="Автоматизация"
          description="Убираем ручную работу из бизнес-процессов."
        />
      </div>
    </main>
  );
}
