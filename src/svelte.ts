import { createMidday } from './core';
import type { MiddayOptions, MiddayInstance } from './types';

/**
 * Svelte action for midday.js (auto mode).
 * Initializes when the element mounts, destroys when it unmounts.
 * Cloning happens client-side — safe for SSR.
 *
 * Usage: <header use:midday> or <header use:midday={{ onChange }}>
 */
export function midday(
  node: HTMLElement,
  options?: MiddayOptions,
): { update: (opts?: MiddayOptions) => void; destroy: () => void } {
  let instance: MiddayInstance | null = createMidday(node, options);

  return {
    update(newOptions?: MiddayOptions) {
      instance?.destroy();
      instance = createMidday(node, newOptions);
    },
    destroy() {
      instance?.destroy();
      instance = null;
    },
  };
}
