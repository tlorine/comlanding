import {
  SYSTEM_SIZE,
  TOOLTIP_OFFSET,
  TOOLTIP_WIDTH,
  TOOLTIP_Z,
} from './config';
import { clamp } from './math';
import type { NodeId, SystemNode } from './types';

export const tooltipId = (id: NodeId) => `orbit-tip-${id}`;

type Props = {
  node: SystemNode;
  x: number;
  y: number;
};

/**
 * Рендерится отдельным слоем поверх сцены, а не внутри ноды:
 * не наследует scale/opacity ноды и не уезжает за границы сцены.
 */
export function NodeTooltip({ node, x, y }: Props) {
  const half = TOOLTIP_WIDTH / 2;
  const left = clamp(x, half, SYSTEM_SIZE - half);

  return (
    <div
      id={tooltipId(node.id)}
      role="tooltip"
      className="pointer-events-none absolute -translate-x-1/2 rounded-xl border border-white/10 bg-black/80 p-3 text-left text-xs text-white/60 shadow-2xl backdrop-blur-md"
      style={{
        left,
        top: y + TOOLTIP_OFFSET,
        width: TOOLTIP_WIDTH,
        zIndex: TOOLTIP_Z,
      }}
    >
      <div className="mb-1 font-medium text-white">{node.label}</div>
      <div>{node.description}</div>
    </div>
  );
}
