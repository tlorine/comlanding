export const LEAD_LIMITS = {
  taskMin: 10,
  taskMax: 1000,
  contactMax: 100,
  nameMax: 80,
} as const;

export const MODAL_TITLE_ID = 'contact-modal-title';
export const MODAL_DESC_ID = 'contact-modal-desc';

export const LEAD_COPY = {
  eyebrow: 'Новая заявка',
  title: 'Обсудить задачу',
  description:
    'Опишите задачу в паре предложений. Мы свяжемся с вами и уточним детали.',

  fields: {
    task: {
      label: 'Что нужно сделать?',
      placeholder: 'Например: нужен личный кабинет для клиентов с оплатой и интеграцией с CRM',
    },
    contact: {
      label: 'Контакт для связи',
      placeholder: '@username, email или телефон',
      hint: 'Telegram, email или телефон, как вам удобнее',
    },
    name: {
      label: 'Как к вам обращаться?',
      placeholder: 'Имя',
      optional: 'необязательно',
    },
  },

  submit: {
    idle: 'Отправить заявку',
    submitting: 'Отправляем…',
    retry: 'Отправить ещё раз',
  },

  success: {
    title: 'Заявка отправлена',
    description: 'Спасибо! Мы свяжемся с вами по указанному контакту.',
    close: 'Закрыть',
  },

  errors: {
    taskRequired: 'Опишите, что нужно сделать',
    taskTooShort: `Чуть подробнее: минимум ${LEAD_LIMITS.taskMin} символов`,
    taskTooLong: `Слишком длинно: максимум ${LEAD_LIMITS.taskMax} символов`,
    contactRequired: 'Укажите, как с вами связаться',
    contactInvalid: 'Нужен @username в Telegram, email или телефон',
    contactTooLong: `Максимум ${LEAD_LIMITS.contactMax} символов`,
    nameTooLong: `Максимум ${LEAD_LIMITS.nameMax} символов`,
    submitFailed:
      'Не удалось отправить заявку. Проверьте соединение и попробуйте ещё раз.',
  },

  closeLabel: 'Закрыть',
  sending: 'Отправляем заявку…',
} as const;