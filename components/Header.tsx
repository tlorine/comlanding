export default function Header() {
  return (
    <header className="flex items-center justify-between border-b border-white/10 py-6">
      <div className="text-lg font-semibold">
        STUDIO
      </div>

      <nav className="hidden gap-8 text-sm text-white/60 md:flex">
        <a href="#services">Услуги</a>
        <a href="#process">Процесс</a>
        <a href="#cases">Кейсы</a>
      </nav>

      <button className="rounded-full border border-white/20 px-5 py-2 text-sm transition hover:border-white/40 hover:bg-white/5">
        Обсудить задачу
      </button>
    </header>
  )
}