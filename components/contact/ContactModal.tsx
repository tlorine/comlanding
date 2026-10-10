'use client';

import { useEffect, useRef } from 'react';
import { CloseIcon } from './icons';
import { LeadForm } from './LeadForm';
import { LeadSuccess } from './LeadSuccess';
import { LEAD_COPY, MODAL_DESC_ID, MODAL_TITLE_ID } from './contact.config';
import { useBodyScrollLock } from './hooks/useBodyScrollLock';
import { useLeadForm } from './hooks/useLeadForm';

/**
 * Нативный <dialog>: фокус-трап, Escape, inert-фон и возврат фокуса
 * на кнопку-триггер работают из коробки.
 * Монтируется только в открытом состоянии, поэтому форма каждый раз чистая.
 */
export function ContactModal({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressStartedOnBackdrop = useRef(false);

  const form = useLeadForm();
  const busy = form.status === 'submitting';

  useBodyScrollLock();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!dialog.open) dialog.showModal(); // guard для StrictMode

    // на тач-устройствах автофокус открыл бы клавиатуру поверх формы
    if (window.matchMedia('(pointer: fine)').matches) {
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
  }, []);

  const close = () => dialogRef.current?.close();

  return (
    // На <dialog> нельзя вешать display-классы (flex/block): они перебьют скрытие закрытого диалога.
    // m-auto нужен явно: Tailwind preflight (v4) обнуляет margin, и диалог уезжает в угол.
    <dialog
      ref={dialogRef}
      aria-labelledby={MODAL_TITLE_ID}
      aria-describedby={MODAL_DESC_ID}
      className="m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#0a0a0a] p-0 text-white shadow-[0_0_80px_rgba(255,255,255,0.06)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      onCancel={(e) => {
        if (busy) e.preventDefault(); // Escape не должен обрывать отправку
      }}
      onClose={onClose}
      // закрываем по клику на фон, только если нажатие тоже началось на фоне
      // (иначе выделение текста с выходом за край модалки закрывало бы её)
      onPointerDown={(e) => {
        pressStartedOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && pressStartedOnBackdrop.current && !busy) {
          close();
        }
      }}
    >
      <div className="relative p-6 sm:p-8">
        <button
          type="button"
          aria-label={LEAD_COPY.closeLabel}
          onClick={close}
          disabled={busy}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white disabled:opacity-30 sm:right-6 sm:top-6"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        {form.status === 'success' ? (
          <LeadSuccess onClose={close} />
        ) : (
          <LeadForm form={form} />
        )}
      </div>
    </dialog>
  );
}