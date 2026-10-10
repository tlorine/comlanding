import { useEffect, useLayoutEffect } from 'react';

// useLayoutEffect на сервере выдаёт предупреждение (React 18)
export const useIsoLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
