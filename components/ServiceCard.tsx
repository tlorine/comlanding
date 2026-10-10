type Props = {
  number: string;
  title: string;
  description: string;
  tags?: readonly string[];
};

export default function ServiceCard({ number, title, description, tags }: Props) {
  return (
    <article className="group flex h-full min-w-0 flex-col rounded-2xl border border-white/10 bg-[#111111] p-6 transition duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:bg-[#141414] motion-reduce:transition-colors motion-reduce:hover:translate-y-0">
      <span className="font-mono text-xs tracking-[0.2em] text-white/30 transition-colors duration-300 group-hover:text-white/60">
        {number}
      </span>

      <h3 className="mt-10 break-words text-xl font-semibold tracking-tight">{title}</h3>

      <p className="mt-3 break-words text-sm leading-relaxed text-white/50">{description}</p>

      {tags && tags.length > 0 && (
        <ul className="mt-8 flex flex-wrap gap-2 pt-px">
          {tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider text-white/40 transition-colors duration-300 group-hover:border-white/20 group-hover:text-white/60"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}