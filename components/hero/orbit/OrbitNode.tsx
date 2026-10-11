import { memo } from 'react';
import { MAX_OPACITY, MAX_SCALE, MIN_OPACITY, MIN_SCALE } from './config';
import { lerp, nodeZIndex } from './math';
import { NODE_ATTR, type NodeHandlers } from './hooks/useActiveNode';
import { tooltipId } from './NodeTooltip';
import type { SystemNode } from './types';

// ── Node shape system ──────────────────────────────────────────────────────
// All nodes share one unified form: a rounded-square panel.
// Differentiation is through the label only — no random geometric shapes.
// A consistent form language reads as a designed system; mixed shapes
// (hexagon / diamond / circle / square) read as arbitrary and unfinished.
//
// The label IS the identifier. The shape is the container.

type Props = {
  node: SystemNode;
  x: number;
  y: number;
  depth: number;
  isActive: boolean;
  isDimmed: boolean;
  handlers: NodeHandlers;
  /** 0..1 — energy burst level from Core pulse; drives reflected-light glow */
  pulse: number;
};

export const OrbitNode = memo(function OrbitNode({
  node,
  x,
  y,
  depth,
  isActive,
  isDimmed,
  handlers,
  pulse,
}: Props) {
  const scale   = lerp(MIN_SCALE, MAX_SCALE, depth);
  const opacity = isActive ? 1 : lerp(MIN_OPACITY, MAX_OPACITY, depth);

  // Border contrast scales with depth — near nodes are more defined.
  // Amplified during pulse: near nodes gain more border brightness than far ones.
  const borderAlpha = lerp(0.07, 0.32, depth) + pulse * 0.15 * lerp(0.4, 1.0, depth);
  const borderColor = isActive
    ? 'rgba(150, 178, 218, 0.55)'
    : `rgba(105, 122, 150, ${borderAlpha.toFixed(2)})`;

  // Label brightness follows depth: near nodes are more legible.
  const labelOpacity = isDimmed ? 0.38 : lerp(0.58, 0.84, depth);

  // Active state: precise inset ring.
  // Inactive during pulse peak: distance-weighted ambient glow — reflected light
  // from Core burst. Near nodes (depth≈1) get full 0.30 opacity; far nodes get 40%.
  // Suppressed while dimmed (another node is active) to preserve focus.
  const glowAlpha = pulse * 0.30 * lerp(0.4, 1.0, depth);
  const ambientGlow =
    !isActive && !isDimmed && glowAlpha > 0.01
      ? `0 0 ${Math.round(pulse * 18 + 4)}px rgba(50, 130, 255, ${glowAlpha.toFixed(2)})`
      : undefined;

  const boxShadow = isActive
    ? '0 0 0 1px rgba(140, 168, 210, 0.38), inset 0 0 0 1px rgba(140, 168, 210, 0.14)'
    : ambientGlow;

  return (
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
      <button
        type="button"
        aria-expanded={isActive}
        aria-describedby={isActive ? tooltipId(node.id) : undefined}
        className="node-glass flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border transition-[border-color,box-shadow,opacity] duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
        style={{
          opacity: isDimmed ? 0.20 : 1,
          borderColor,
          boxShadow,
        }}
        {...handlers}
      >
        <span
          className="select-none font-mono text-[10px] uppercase leading-none tracking-[0.20em]"
          style={{ color: `rgba(255,255,255,${labelOpacity.toFixed(2)})` }}
        >
          {node.label}
        </span>
      </button>
    </div>
  );
});
