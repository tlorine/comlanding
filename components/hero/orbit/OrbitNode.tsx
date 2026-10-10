import { memo } from 'react';
import {
  MAX_OPACITY,
  MAX_SCALE,
  MIN_OPACITY,
  MIN_SCALE,
} from './config';
import { lerp, nodeZIndex } from './math';
import { NODE_ATTR, type NodeHandlers } from './hooks/useActiveNode';
import { tooltipId } from './NodeTooltip';
import type { SystemNode } from './types';

type Props = {
  node: SystemNode;
  x: number;
  y: number;
  depth: number;
  isActive: boolean;
  isDimmed: boolean;
  handlers: NodeHandlers;
};

export const OrbitNode = memo(function OrbitNode({
  node,
  x,
  y,
  depth,
  isActive,
  isDimmed,
  handlers,
}: Props) {
  const scale = lerp(MIN_SCALE, MAX_SCALE, depth);
  const opacity = isActive ? 1 : lerp(MIN_OPACITY, MAX_OPACITY, depth);

  return (
    // внешний слой: позиция, глубина, масштаб орбиты
    <div
      {...{ [NODE_ATTR]: '' }}
      className="absolute"
      style={{
        left: x,
        top: y,
        zIndex: nodeZIndex(depth, isActive),
        opacity,
        transform: `translate(-50%, -50%) scale(${scale})`,
      }}
    >
      {/* внутренний слой: hover-анимации, независимые от орбиты */}
      <button
        type="button"
        aria-expanded={isActive}
        aria-describedby={isActive ? tooltipId(node.id) : undefined}
        className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border bg-[#0a0a0a] text-xs transition-[transform,opacity,border-color,box-shadow] duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        style={{
          transform: isActive ? 'scale(1.2)' : 'scale(1)',
          opacity: isDimmed ? 0.3 : 1,
          borderColor: isActive
            ? 'rgba(255,255,255,0.7)'
            : 'rgba(255,255,255,0.2)',
          boxShadow: isActive ? '0 0 30px rgba(255,255,255,0.15)' : 'none',
        }}
        {...handlers}
      >
        {node.label}
      </button>
    </div>
  );
});