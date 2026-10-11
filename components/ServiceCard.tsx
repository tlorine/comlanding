import type { ReactElement } from 'react';

// ── Per-card SVG icons ─────────────────────────────────────────────────────
// Stroke-based, 32×32 viewBox — consistent weight across all four cards.
// Color is set via `currentColor` on the wrapper; the wrapper uses a cold
// blue-grey that matches the orbit system palette (rgb 120,148,185).
// Icons are specific to each service category, not generic tech decoration.

const CARD_ICONS: Record<string, ReactElement> = {
  // < / > — code syntax brackets
  '01': (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="11,8 5,16 11,24" />
      <polyline points="21,8 27,16 21,24" />
      <line x1="19.5" y1="8" x2="12.5" y2="24" />
    </svg>
  ),
  // ↺ — circular refresh arrow (process cycle / automation)
  '02': (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 5 A11 11 0 1 1 6.5 21.5" />
      <polyline points="1.5,21.5 6.5,21.5 9,17" />
    </svg>
  ),
  // ○—○ neural graph — centre node connected to four corner nodes
  '03': (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" aria-hidden="true">
      <circle cx="16" cy="16" r="2.8" strokeWidth="1.5" />
      <circle cx="7"  cy="7"  r="1.8" strokeWidth="1.2" />
      <circle cx="25" cy="7"  r="1.8" strokeWidth="1.2" />
      <circle cx="7"  cy="25" r="1.8" strokeWidth="1.2" />
      <circle cx="25" cy="25" r="1.8" strokeWidth="1.2" />
      <line x1="9.3"  y1="9.3"  x2="13.8" y2="13.8" strokeWidth="1" strokeLinecap="round" />
      <line x1="22.7" y1="9.3"  x2="18.2" y2="13.8" strokeWidth="1" strokeLinecap="round" />
      <line x1="9.3"  y1="22.7" x2="13.8" y2="18.2" strokeWidth="1" strokeLinecap="round" />
      <line x1="22.7" y1="22.7" x2="18.2" y2="18.2" strokeWidth="1" strokeLinecap="round" />
    </svg>
  ),
  // □→□ — two blocks linked by a directed connector (API / integration)
  '04': (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2"  y="11" width="9"  height="10" rx="2" />
      <rect x="21" y="11" width="9"  height="10" rx="2" />
      <line x1="11" y1="16" x2="21" y2="16" />
      <polyline points="18,12.5 21,16 18,19.5" />
    </svg>
  ),
};

type Props = {
  number: string;
  title: string;
  description: string;
  tags?: readonly string[];
};

export default function ServiceCard({ number, title, description, tags }: Props) {
  const icon = CARD_ICONS[number];

  return (
    <article className="group flex h-full min-w-0 flex-col rounded-2xl border border-white/10 bg-[#111111] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-[#141414] hover:shadow-[0_16px_48px_rgba(0,0,0,0.55)] motion-reduce:transition-colors motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none">

      {/* Number + icon row — number anchors reading order, icon provides
          category identity. Both are quiet; neither competes with the title. */}
      <div className="flex items-start justify-between">
        <span className="font-mono text-xs tracking-[0.2em] text-white/30 transition-colors duration-300 group-hover:text-white/60">
          {number}
        </span>
        {icon && (
          <div className="h-8 w-8 text-[rgb(120,148,185)] opacity-35 transition-opacity duration-300 group-hover:opacity-60">
            {icon}
          </div>
        )}
      </div>

      <h3 className="mt-8 break-words text-xl font-semibold tracking-tight">{title}</h3>

      <p className="mt-3 break-words text-sm leading-relaxed text-white/50">{description}</p>

      {tags && tags.length > 0 && (
        // mt-auto anchors the tag row to the card bottom regardless of
        // description length — keeps the grid row visually consistent.
        <ul className="mt-auto flex flex-wrap gap-2 pt-6">
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
