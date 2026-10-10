// Чистые функции без React и браузерных API:
// их же можно вызвать на сервере (route handler) для повторной проверки.
import { LEAD_COPY, LEAD_LIMITS } from './contact.config';
import type {
  ContactType,
  FieldErrors,
  LeadField,
  ValidationResult,
} from './types';

const E = LEAD_COPY.errors;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TG_HANDLE_RE = /^@[a-zA-Z][a-zA-Z0-9_]{4,31}$/;
const TG_LINK_RE = /^(?:https?:\/\/)?t\.me\/([a-zA-Z][a-zA-Z0-9_]{4,31})\/?$/i;
const PHONE_RE = /^\+?[\d\s\-().]{10,20}$/;

/** Определяет тип контакта и приводит его к единому виду */
export function detectContact(
  raw: string,
): { type: ContactType; value: string } | null {
  const v = raw.trim();

  if (EMAIL_RE.test(v)) return { type: 'email', value: v.toLowerCase() };
  if (TG_HANDLE_RE.test(v)) return { type: 'telegram', value: v };

  const link = v.match(TG_LINK_RE);
  if (link) return { type: 'telegram', value: `@${link[1]}` };

  if (PHONE_RE.test(v)) {
    const digits = v.replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 15) {
      return { type: 'phone', value: `${v.startsWith('+') ? '+' : ''}${digits}` };
    }
  }

  return null;
}

export function validateField(name: LeadField, raw: string): string | undefined {
  const value = raw.trim();

  switch (name) {
    case 'task':
      if (!value) return E.taskRequired;
      if (value.length < LEAD_LIMITS.taskMin) return E.taskTooShort;
      if (value.length > LEAD_LIMITS.taskMax) return E.taskTooLong;
      return undefined;

    case 'contact':
      if (!value) return E.contactRequired;
      if (value.length > LEAD_LIMITS.contactMax) return E.contactTooLong;
      if (!detectContact(value)) return E.contactInvalid;
      return undefined;

    case 'name':
      if (value.length > LEAD_LIMITS.nameMax) return E.nameTooLong;
      return undefined;
  }
}

export function validateLead(values: Record<LeadField, string>): ValidationResult {
  const errors: FieldErrors = {};

  (['task', 'contact', 'name'] as const).forEach((field) => {
    const message = validateField(field, values[field]);
    if (message) errors[field] = message;
  });

  const contact = detectContact(values.contact);

  if (Object.keys(errors).length > 0 || !contact) {
    return { ok: false, errors };
  }

  const name = values.name.trim();

  return {
    ok: true,
    data: {
      task: values.task.trim(),
      contact: contact.value,
      contactType: contact.type,
      ...(name ? { name } : {}),
    },
  };
}