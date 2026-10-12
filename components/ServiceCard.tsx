import type { ReactElement } from 'react';

// ── Per-card SVG icons ─────────────────────────────────────────────────────
// Stroke-based, 32×32 viewBox — consistent weight across all four cards.
// Color is set via `currentColor` on the wrapper; the wrapper uses a cold
// blue that matches the orbit system palette.
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
    <article className="group flex h-full min-w-0 flex-col rounded-xl border border-white/8 bg-[#111418] p-6 transition-all duration-300 hover:border-blue-500/25 hover:bg-[#12151b] hover:shadow-[0_8px_40px_rgba(30,80,200,0.10)] motion-reduce:transition-colors motion-reduce:hover:shadow-none">

      {/* Number — top-left reading anchor */}
      <span className="font-mono text-xs tracking-[0.18em] text-white/25 transition-colors duration-300 group-hover:text-white/50">
        {number}
      </span>

      {/* Icon — left-aligned below number, category identity */}
      {icon && (
        <div className="mt-5 h-9 w-9 text-[rgb(88,145,215)] opacity-45 transition-opacity duration-300 group-hover:opacity-80">
          {icon}
        </div>
      )}

      <h3 className="mt-6 break-words text-lg font-semibold leading-snug tracking-tight">
        {title}
      </h3>

      <p className="mt-2.5 break-words text-sm leading-relaxed text-white/45">
        {description}
      </p>

      {tags && tags.length > 0 && (
        // mt-auto anchors tags to card bottom regardless of description length
        <ul className="mt-auto flex flex-wrap gap-1.5 pt-5" aria-label="Теги направления">
          {tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-white/8 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/30 transition-colors duration-300 group-hover:border-white/15 group-hover:text-white/45"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
