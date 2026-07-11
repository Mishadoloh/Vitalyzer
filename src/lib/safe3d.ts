'use client';

import { useEffect, useState } from 'react';

// WebGL on machines without GPU acceleration falls back to a software rasterizer
// (SwiftShader/llvmpipe) that can freeze the whole renderer on a large canvas.
// Probe once and skip 3D scenes there — pages keep their CSS animations, so the
// fallback is graceful.
export function isHardwareAccelerated(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    (gl.getExtension('WEBGL_lose_context') as { loseContext?: () => void } | null)?.loseContext?.();
    return !/swiftshader|llvmpipe|software|basic render/i.test(renderer);
  } catch {
    return false;
  }
}

// Gate for mounting any r3f <Canvas>: false until mounted client-side, and
// permanently false when the user prefers reduced motion or the GPU is software.
export function useSafe3D(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setEnabled(!reducedMotion && isHardwareAccelerated());
  }, []);
  return enabled;
}

// r3f mounts the scene only after react-use-measure reports a non-zero size, and
// react-use-measure relies on ResizeObserver callbacks. Some embedded browsers
// never deliver those callbacks, so the canvas would stay at its 300x150 default
// forever. This hybrid observer (passed via Canvas `resize.polyfill`) delegates
// to the native RO when it works and additionally self-triggers on mount and on
// window resize — spurious triggers are harmless (they just cause a re-measure).
export class HybridResizeObserver {
  private cb: ResizeObserverCallback;
  private native: ResizeObserver | null;
  private targets = new Set<Element>();
  private onResize = () => this.fire();

  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
    this.native = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(cb) : null;
  }

  private fire() {
    const entries = Array.from(this.targets).map(
      (target) => ({ target, contentRect: target.getBoundingClientRect() }) as unknown as ResizeObserverEntry
    );
    if (entries.length) this.cb(entries, this as unknown as ResizeObserver);
  }

  observe(target: Element) {
    this.native?.observe(target);
    if (this.targets.size === 0) window.addEventListener('resize', this.onResize);
    this.targets.add(target);
    // Initial + delayed re-measure (layout may settle after fonts/hydration).
    requestAnimationFrame(() => this.fire());
    setTimeout(() => this.fire(), 350);
  }

  unobserve(target: Element) {
    this.native?.unobserve(target);
    this.targets.delete(target);
    if (this.targets.size === 0) window.removeEventListener('resize', this.onResize);
  }

  disconnect() {
    this.native?.disconnect();
    this.targets.clear();
    window.removeEventListener('resize', this.onResize);
  }
}
