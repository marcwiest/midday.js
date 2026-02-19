import { createMidday } from './core';
import type { MiddayOptions, MiddayInstance, ActiveVariant } from './types';

/**
 * Initialize midday.js on a fixed header element.
 *
 * @param header - The fixed/sticky header element to enhance
 * @param options - Configuration options
 * @returns An instance with refresh() and destroy() methods
 *
 * @example
 * ```js
 * const instance = midday(document.querySelector('header'), {
 *   defaultClass: 'default',
 * });
 *
 * // After DOM changes:
 * instance.refresh();
 *
 * // Cleanup:
 * instance.destroy();
 * ```
 */
export function midday(
  header: HTMLElement,
  options?: Partial<MiddayOptions>,
): MiddayInstance {
  return createMidday(header, options);
}

export type { MiddayOptions, MiddayInstance, ActiveVariant };
