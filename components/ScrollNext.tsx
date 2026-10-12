'use client';

import { useEffect, useRef, useState } from 'react';

// ── Section registry ─────────────────────────────────────────────────────────
// Only sections the button should navigate TO, in order.
const SECTIONS = [
  { id: 'services', label: 'Услуги'  },
  { id: 'process',  label: 'Процесс' },
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the index of the last section whose top edge is above mid-viewport.
 *  −1 = still in the hero area (no section has passed mid yet). */
function computeIdx(): number {
  const mid = window.innerHeight * 0.5;
  let last = -1;
  for (let i = 0; i < SECTIONS.length; i++) {
    const el = document.getElementById(SECTIONS[i].id);
    if (el && el.getBoundingClientRect().top < mid) last = i;
  }
  return last;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ScrollNext() {
  const [idx, setIdx] = useState(-1);

  // While a programmatic scroll is running we lock idx so the continuous
  // scroll events cannot advance the section counter prematurely and unmount
  // the button mid-animation.
  const lockedRef      = useRef(false);
  const unlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onScroll() {
      if (!lockedRef.current) setIdx(computeIdx());
    }

    setIdx(computeIdx());
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  // Clean up any pending timer on unmount.
  useEffect(() => () => {
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
  }, []);

  const nextIdx = idx + 1;
  if (nextIdx >= SECTIONS.length) return null;

  const next = SECTIONS[nextIdx];

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    const target = document.getElementById(next.id);
    if (!target) return;

    // Lock idx so scroll events don't update state during the animation.
    lockedRef.current = true;
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Unlock and recompute once the scroll animation has settled.
    function unlock() {
      if (!lockedRef.current) return; // already unlocked (double-fire guard)
      lockedRef.current = false;
      window.removeEventListener('scrollend', onScrollEnd);
      if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);
      setIdx(computeIdx());
    }

    function onScrollEnd() { unlock(); }

    // `scrollend` fires in Chrome 114+, Firefox 109+, Safari 18.2+.
    // The 1.2 s timeout is a safety net for older engines.
    window.addEventListener('scrollend', onScrollEnd, { once: true });
    unlockTimerRef.current = setTimeout(unlock, 1200);
  }

  return (
    <a
      href={`#${next.id}`}
      onClick={handleClick}
      aria-label={`Перейти к разделу — ${next.label}`}
      className="fixed bottom-8 left-1/2 z-10 flex min-h-11 -translate-x-1/2 flex-col items-center justify-end gap-1.5 text-sm text-white/40 transition-colors duration-200 hover:text-white/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]"
    >
      <span className="hidden tracking-wide sm:inline">{next.label}</span>
      <span aria-hidden="true" className="text-base leading-none text-[rgb(88,145,215)]">↓</span>
    </a>
  );
}
