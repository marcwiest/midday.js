import { createMidday } from './core';
import { createMiddayHeadless } from './headless';
import type {
  MiddayOptions,
  MiddayHeadlessOptions,
  MiddayInstance,
  ActiveVariant,
} from './types';

/**
 * Auto mode — Initialize midday.js on a fixed element.
 * Automatically clones element content for each variant and manages the DOM.
 *
 * @param element - The fixed/sticky element marked with data-midday-element
 * @param options - Optional configuration
 * @returns Instance with refresh() and destroy() methods
 *
 * @example
 * ```js
 * const instance = midday(document.querySelector('[data-midday-element]'));
 * ```
 */
export function midday(
  element: HTMLElement,
  options?: MiddayOptions,
): MiddayInstance {
  return createMidday(element, options);
}

/**
 * Headless mode — Bring your own variant elements.
 * Manages only clip-paths on pre-rendered elements. No DOM cloning.
 *
 * @param options - Header, variant elements, and optional config
 * @returns Instance with refresh() and destroy() methods
 */
export function middayHeadless(
  options: MiddayHeadlessOptions,
): MiddayInstance {
  return createMiddayHeadless(options);
}

export type { MiddayOptions, MiddayHeadlessOptions, MiddayInstance, ActiveVariant };
