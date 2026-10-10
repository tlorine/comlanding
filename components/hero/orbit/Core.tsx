import { CORE_Z } from './config';

export function Core() {
  return (
    <div
      className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#0a0a0a] shadow-[0_0_60px_rgba(255,255,255,0.08)]"
      style={{ zIndex: CORE_Z }}
    >
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">
          Core
        </div>
        <div className="mt-1 text-lg font-medium">Product</div>
      </div>
    </div>
  );
}
