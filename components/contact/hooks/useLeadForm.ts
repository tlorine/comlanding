import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { LEAD_COPY } from '../contact.config';
import { submitLead } from '../submitLead';
import type {
  FieldErrors,
  LeadField,
  LeadStatus,
  LeadSubmitter,
  LeadValues,
} from '../types';
import { validateField, validateLead } from '../validation';

const EMPTY: LeadValues = { task: '', contact: '', name: '', trap: '' };
const FIELD_ORDER: LeadField[] = ['task', 'contact', 'name'];

function focusFirstInvalid(form: HTMLFormElement, errors: FieldErrors) {
  const first = FIELD_ORDER.find((name) => errors[name]);
  if (!first) return;

  // rAF: поля могут быть ещё disabled до следующего рендера
  requestAnimationFrame(() => {
    (form.elements.namedItem(first) as HTMLElement | null)?.focus();
  });
}

/**
 * Вся логика формы: значения, валидация, статусы.
 * Отправка приходит снаружи (по умолчанию заглушка), UI про неё ничего не знает.
 */
export function useLeadForm(submit: LeadSubmitter = submitLead) {
  const [values, setValues] = useState<LeadValues>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<LeadStatus>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const field = (name: LeadField) => ({
    name,
    value: values[name],
    error: errors[name],
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setValues((v) => ({ ...v, [name]: value }));
      // ошибку убираем/обновляем сразу, как только человек начал править
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
      }
    },
    // не ругаемся на пустое поле при простом проходе Tab-ом, пустое поймает submit
    onBlur: () => {
      if (!values[name].trim()) return;
      setErrors((prev) => ({ ...prev, [name]: validateField(name, values[name]) }));
    },
  });

  // Honeypot: скрытое поле, которое заполняют только боты
  const honeypot = {
    name: 'hp_company',
    value: values.trap,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setValues((v) => ({ ...v, trap: value }));
    },
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === 'submitting') return;

    const form = e.currentTarget; // после await currentTarget уже null

    const result = validateLead(values);
    if (!result.ok) {
      setErrors(result.errors);
      setFormError(null);
      focusFirstInvalid(form, result.errors);
      return;
    }

    // бот: делаем вид, что всё хорошо, и ничего не отправляем
    if (values.trap) {
      setStatus('success');
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setErrors({});
    setFormError(null);
    setStatus('submitting');

    try {
      const res = await submit(result.data, { signal: controller.signal });
      if (controller.signal.aborted) return;

      if (res.ok) {
        setStatus('success');
        return;
      }

      if (res.fieldErrors) {
        setErrors(res.fieldErrors);
        focusFirstInvalid(form, res.fieldErrors);
      }
      setFormError(res.error);
      setStatus('error');
    } catch {
      if (controller.signal.aborted) return;
      setFormError(LEAD_COPY.errors.submitFailed);
      setStatus('error');
    }
  };

  return { status, formError, field, honeypot, handleSubmit };
}

export type LeadFormApi = ReturnType<typeof useLeadForm>;