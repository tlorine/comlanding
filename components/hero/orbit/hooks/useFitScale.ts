import { useRef, useState } from 'react';
import { useIsoLayoutEffect } from './useIsoLayoutEffect';

/** Масштаб сцены под ширину контейнера (на десктопе = 1) */
export function useFitScale<T extends HTMLElement>(baseSize: number) {
  const ref = useRef<T>(null);
  const [fit, setFit] = useState(1);

  // layout-эффект, чтобы не было скачка размера после гидратации
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const width = el.clientWidth;
      if (width) setFit(Math.min(1, width / baseSize));
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [baseSize]);

  return { ref, fit };
}
