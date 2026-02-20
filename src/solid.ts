import { onMount, onCleanup } from 'solid-js';
import { createMidday as createMiddayCore } from './core';
import type { MiddayOptions, MiddayInstance } from './types';

/**
 * Solid primitive for midday.js (auto mode).
 * Initializes on mount, cleans up on disposal.
 * Cloning happens client-side — safe for SSR.
 */
export function createMidday(
  headerAccessor: () => HTMLElement | null,
  options?: MiddayOptions,
): () => MiddayInstance | null {
  let instance: MiddayInstance | null = null;

  onMount(() => {
    const header = headerAccessor();
    if (!header) return;
    instance = createMiddayCore(header, options);
  });

  onCleanup(() => {
    instance?.destroy();
    instance = null;
  });

  return () => instance;
}
