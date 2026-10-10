import { useEffect, useState } from 'react';
import { MAX_FRAME_MS } from '../config';

/**
 * Время анимации в секундах.
 * Пока running = false, цикл rAF полностью остановлен;
 * при возобновлении отсчёт продолжается без скачка.
 */
export function useOrbitClock(running: boolean) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!running) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(now - last, MAX_FRAME_MS);
      last = now;
      setSeconds((s) => s + dt / 1000);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  return seconds;
}
