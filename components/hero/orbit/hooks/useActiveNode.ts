import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent, FocusEvent } from 'react';
import type { NodeId } from '../types';

export const NODE_ATTR = 'data-orbit-node';

/**
 * Вся логика подсказок в одном месте:
 * mouse — hover, touch/pen — тап (toggle), клавиатура — фокус и Escape.
 * Клик/тап вне ноды закрывает подсказку.
 */
export function useActiveNode() {
  const [activeId, setActiveId] = useState<NodeId | null>(null);
  const lastInput = useRef<string>('mouse');

  useEffect(() => {
    if (!activeId) return;

    const onPointerDown = (e: globalThis.PointerEvent) => {
      if (!(e.target as Element).closest(`[${NODE_ATTR}]`)) setActiveId(null);
    };
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setActiveId(null);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [activeId]);

  const bind = useCallback(
    (id: NodeId) => ({
      onPointerDown: (e: PointerEvent) => {
        lastInput.current = e.pointerType;
      },
      onKeyDown: (_: KeyboardEvent) => {
        lastInput.current = 'keyboard';
      },
      onPointerEnter: (e: PointerEvent) => {
        if (e.pointerType === 'mouse') setActiveId(id);
      },
      onPointerLeave: (e: PointerEvent) => {
        if (e.pointerType === 'mouse') setActiveId(null);
      },
      // Только для клавиатурной навигации: при тапе фокус приходит раньше click
      // и сразу открыл бы подсказку, которую click затем закрыл бы.
      onFocus: (e: FocusEvent<HTMLElement>) => {
        if (e.currentTarget.matches(':focus-visible')) setActiveId(id);
      },
      onBlur: () => setActiveId((cur) => (cur === id ? null : cur)),
      onClick: () => {
        const isMouse = lastInput.current === 'mouse';
        setActiveId((cur) => (isMouse ? id : cur === id ? null : id));
      },
    }),
    [],
  );

  return { activeId, bind };
}

export type NodeHandlers = ReturnType<ReturnType<typeof useActiveNode>['bind']>;
