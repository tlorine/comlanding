import { useEffect, useState } from 'react';

/**
 * Returns a scale factor such that the element's rendered height never exceeds
 * `maxVhFraction` of the viewport height.  Uses `window.innerHeight` directly
 * to avoid the ResizeObserver feedback loop that arises when the parent element
 * is already CSS-transformed.
 */
export function useHeightFit(naturalSize: number, maxVhFraction = 0.60): number {
  const [fit, setFit] = useState(1);
  useEffect(() => {
    const update = () =>
      setFit(Math.min(1, (window.innerHeight * maxVhFraction) / naturalSize));
    update();
    window.addEventListener('resize', update, { passive: true });
    return () => window.removeEventListener('resize', update);
  }, [naturalSize, maxVhFraction]);
  return fit;
}
