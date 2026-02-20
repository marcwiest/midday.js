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

/**
 * Solid directive for midday.js (auto mode).
 * Usage: <header use:midday> or <header use:midday={{ onChange }}>
 *
 * TypeScript: extend JSX.DirectiveFunctions in your app:
 *   declare module "solid-js" {
 *     namespace JSX {
 *       interface DirectiveFunctions {
 *         midday: typeof import('midday.js/solid').midday;
 *       }
 *     }
 *   }
 */
export function midday(el: HTMLElement, accessor: () => MiddayOptions | undefined): void {
  const instance = createMiddayCore(el, accessor());

  onCleanup(() => {
    instance.destroy();
  });
}
