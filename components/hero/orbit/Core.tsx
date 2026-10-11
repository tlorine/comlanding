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
      {/*
        Tight static drop-shadow defines the sphere edge against the dark background.
        8px blur keeps the glow hugging the silhouette — not a diffuse CSS blob.
        Dynamic pulsation lives inside the shader (hot-spot expansion, rim brightening)
        and the surrounding scene (SVG gradient overlay, canvas halo).
      */}
      <div style={{ filter: 'drop-shadow(0 0 8px rgba(55,135,255,0.38)) drop-shadow(0 0 2px rgba(100,180,255,0.24))' }}>
        <CoreBoundary>
          <CoreScene reducedMotion={reducedMotion} inView={inView} />
        </CoreBoundary>
      </div>
      {/* Product label — sits below sphere equator, reads against dark core */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-5">
        <span className="select-none font-mono text-[8px] uppercase tracking-[0.28em] text-white/28">
          Product
        </span>
      </div>
    </div>
  );
}
