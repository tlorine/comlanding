import { CheckIcon } from './icons';
import { LEAD_COPY, MODAL_DESC_ID, MODAL_TITLE_ID } from './contact.config';

export function LeadSuccess({ onClose }: { onClose: () => void }) {
  const { success } = LEAD_COPY;

  return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 shadow-[0_0_60px_rgba(255,255,255,0.08)]">
        <CheckIcon className="h-7 w-7" />
      </div>

      <h2 id={MODAL_TITLE_ID} className="mt-6 text-2xl font-semibold tracking-tight">
        {success.title}
      </h2>
      <p id={MODAL_DESC_ID} role="status" className="mt-3 max-w-xs text-sm leading-relaxed text-white/50">
        {success.description}
      </p>

      <button
        type="button"
        autoFocus
        onClick={onClose}
        className="mt-8 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {success.close}
      </button>
    </div>
  );
}