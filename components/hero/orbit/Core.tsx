'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { CENTER, CORE_SIZE, CORE_Y_OFFSET, CORE_Z } from './config';
import type { CoreSceneProps } from './CoreScene';

// Dynamic import with ssr:false prevents any Three.js / WebGL code from
// running during server-side pre-rendering or static export.
const CoreScene = dynamic<CoreSceneProps>(
  () => import('./CoreScene').then((mod) => ({ default: mod.CoreScene })),
  { ssr: false },
);

// Error boundary: catches WebGL init failures (context creation, shader
// compile errors, missing extensions). Falls back to an empty slot that
// preserves the layout — the orbit rings and nodes remain fully functional.
class CoreBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export type CoreProps = {
  reducedMotion: boolean;
  inView: boolean;
};

export function Core({ reducedMotion, inView }: CoreProps) {
  return (
    <div
      // Read by NebulaBackground to anchor the fog glow to the sphere.
      data-orbit-core=""
      className="absolute"
      style={{
        zIndex: CORE_Z,
        width:  CORE_SIZE,
        height: CORE_SIZE,
        // Precise pixel positioning avoids Tailwind's percentage-based centering.
        // CORE_Y_OFFSET shifts the sphere toward the orbit system's perceptual
        // centre — the near (bottom) arc is 2.6× brighter and pulls visual
        // weight below the geometric centre.
        left: CENTER - CORE_SIZE / 2,
        top:  CENTER + CORE_Y_OFFSET - CORE_SIZE / 2,
      }}
    >
      {/* Sphere edge glow — radial gradient at z-index:-1 (below canvas in this
          stacking context). Replaces CSS filter:drop-shadow on the canvas wrapper.
          That filter+WebGL+parent-transform triple compositing layer stack caused
          the canvas to go blank on browser zoom: when the parent CSS transform
          changed, the filter layer was invalidated and read a momentarily blank
          drawing buffer, caching transparent pixels. The sphere never recovered
          without a full page reload.
          A plain gradient div has no compositing layer and no such race. The
          sphere renders on the canvas; the glow shows through its transparent
          alpha outside the silhouette.
          Sphere: r≈90px in 256px canvas → 70% of the div half-width (128px).
          Glow ring at 67–82%: tight inner edge + soft 8-px-equivalent falloff. */}
      <div
        aria-hidden="true"
        className="pointer-events-none"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: -1,
          background:
            'radial-gradient(circle closest-side at 50% 50%, transparent 64%, rgba(100,180,255,0.18) 67%, rgba(55,135,255,0.40) 70%, rgba(55,135,255,0.16) 75%, rgba(55,135,255,0.04) 82%, transparent 88%)',
        }}
      />
      <CoreBoundary>
        <CoreScene reducedMotion={reducedMotion} inView={inView} />
      </CoreBoundary>
      {/* Product label — sits below sphere equator, reads against dark core */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-5">
        <span className="select-none font-mono text-[8px] uppercase tracking-[0.28em] text-white/28">
          Product
        </span>
      </div>
    </div>
  );
}
