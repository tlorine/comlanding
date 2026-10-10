'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { ContactModal } from './ContactModal';

type Props = {
  children: ReactNode;
  className?: string;
};

/** Кнопка + модалка. Клиентская граница минимальная: Hero остаётся серверным. */
export function ContactCta({ children, className = '' }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={`rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/80 ${className}`}
      >
        {children}
      </button>

      {open && <ContactModal onClose={() => setOpen(false)} />}
    </>
  );
}