import { useEffect, useRef, useState } from 'react';

/** Нужен, чтобы не крутить анимацию, когда сцена вне экрана */
export function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(([entry]) =>
      setInView(entry.isIntersecting),
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, inView };
}
