import { useEffect } from 'react';

/** Блокирует прокрутку страницы под модалкой без скачка из-за скроллбара */
export function useBodyScrollLock() {
  useEffect(() => {
    const { body, documentElement } = document;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;
    const scrollbar = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, []);
}