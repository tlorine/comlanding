import { Field } from './Field';
import { SpinnerIcon } from './icons';
import {
  LEAD_COPY,
  LEAD_LIMITS,
  MODAL_DESC_ID,
  MODAL_TITLE_ID,
} from './contact.config';
import type { LeadFormApi } from './hooks/useLeadForm';

const C = LEAD_COPY;

export function LeadForm({ form }: { form: LeadFormApi }) {
  const { status, formError, field, honeypot, handleSubmit } = form;
  const busy = status === 'submitting';

  const submitLabel = busy
    ? C.submit.submitting
    : status === 'error'
      ? C.submit.retry
      : C.submit.idle;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <header className="pr-10">
        <p className="mb-3 text-xs uppercase tracking-[0.2em] text-white/40">
          {C.eyebrow}
        </p>
        <h2
          id={MODAL_TITLE_ID}
          className="text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {C.title}
        </h2>
        <p id={MODAL_DESC_ID} className="mt-3 text-sm leading-relaxed text-white/50">
          {C.description}
        </p>
      </header>

      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <Field
          as="textarea"
          rows={4}
          label={C.fields.task.label}
          placeholder={C.fields.task.placeholder}
          maxLength={LEAD_LIMITS.taskMax}
          initialFocus
          {...field('task')}
        />

        <Field
          label={C.fields.contact.label}
          placeholder={C.fields.contact.placeholder}
          hint={C.fields.contact.hint}
          maxLength={LEAD_LIMITS.contactMax}
          {...field('contact')}
        />

        <Field
          label={C.fields.name.label}
          placeholder={C.fields.name.placeholder}
          optionalLabel={C.fields.name.optional}
          maxLength={LEAD_LIMITS.nameMax}
          autoComplete="name"
          {...field('name')}
        />

        {/* honeypot: скрыто от людей и скринридеров */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <input type="text" tabIndex={-1} autoComplete="off" {...honeypot} />
        </div>
      </fieldset>

      {formError && (
        <div
          role="alert"
          className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {formError}
        </div>
      )}

      {/* кнопка вне fieldset и без disabled: фокус не теряется во время отправки */}
      <button
        type="submit"
        aria-disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-black transition hover:bg-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white aria-disabled:cursor-wait aria-disabled:opacity-60 aria-disabled:hover:bg-white sm:w-auto"
      >
        {busy && <SpinnerIcon className="h-4 w-4 animate-spin" />}
        {submitLabel}
      </button>

      <p className="sr-only" role="status" aria-live="polite">
        {busy ? C.sending : ''}
      </p>
    </form>
  );
}