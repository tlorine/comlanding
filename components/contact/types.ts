export type LeadField = 'task' | 'contact' | 'name';
export type ContactType = 'telegram' | 'email' | 'phone';

/** То, что лежит в полях формы (включая honeypot) */
export type LeadValues = Record<LeadField, string> & { trap: string };

/** Нормализованная заявка: именно это уходит в submitter / на бэкенд */
export type LeadPayload = {
  task: string;
  contact: string;
  contactType: ContactType;
  name?: string;
};

export type FieldErrors = Partial<Record<LeadField, string>>;

export type ValidationResult =
  | { ok: true; data: LeadPayload }
  | { ok: false; errors: FieldErrors };

export type SubmitResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

/**
 * Контракт отправки. UI знает только про него:
 * заглушку и реальный бэкенд можно менять местами без правок интерфейса.
 */
export type LeadSubmitter = (
  payload: LeadPayload,
  options?: { signal?: AbortSignal },
) => Promise<SubmitResult>;

export type LeadStatus = 'idle' | 'submitting' | 'success' | 'error';