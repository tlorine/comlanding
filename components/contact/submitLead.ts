import type { LeadSubmitter } from './types';

const STUB_DELAY_MS = 900;

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));

    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

/**
 * ЗАГЛУШКА: ничего никуда не отправляет.
 *
 * Чтобы подключить бэкенд, достаточно заменить тело этой функции.
 * Сигнатура (LeadSubmitter) и весь интерфейс остаются как есть:
 *
 *   const res = await fetch('/api/leads', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify(payload),
 *     signal,
 *   });
 *   if (res.ok) return { ok: true };
 *   if (res.status === 422) {
 *     const { fieldErrors } = await res.json();
 *     return { ok: false, error: 'Проверьте поля формы', fieldErrors };
 *   }
 *   return { ok: false, error: 'Сервис временно недоступен. Попробуйте позже.' };
 *
 * На сервере повторно вызовите validateLead() из ./validation,
 * затем отправляйте payload в Telegram (payload уже нормализован,
 * contactType подскажет, как оформить сообщение).
 */
export const submitLead: LeadSubmitter = async (payload, options) => {
  await wait(STUB_DELAY_MS, options?.signal);

  // Для ручной проверки состояния ошибки в dev: добавьте __fail__ в текст задачи
  if (process.env.NODE_ENV !== 'production' && payload.task.includes('__fail__')) {
    return {
      ok: false,
      error: 'Не удалось отправить заявку (тестовая ошибка). Попробуйте ещё раз.',
    };
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('[lead:stub] заявка не отправлена, это заглушка', payload);
  }

  return { ok: true };
};