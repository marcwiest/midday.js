import { onMounted, onUnmounted, shallowRef, type Ref, type ObjectDirective } from 'vue';
import { createMidday } from './core';
import type { MiddayOptions, MiddayInstance } from './types';

/**
 * Vue composable for midday.js (auto mode).
 * Initializes on mount, destroys on unmount.
 * Cloning happens client-side — safe for SSR.
 */
export function useMidday(
  headerRef: Ref<HTMLElement | null>,
  options?: MiddayOptions,
): Ref<MiddayInstance | null> {
  const instance = shallowRef<MiddayInstance | null>(null);

  onMounted(() => {
    if (!headerRef.value) return;
    instance.value = createMidday(headerRef.value, options);
  });

  onUnmounted(() => {
    instance.value?.destroy();
    instance.value = null;
  });

  return instance;
}

/**
 * Vue custom directive for midday.js (auto mode).
 * Usage: <header v-midday> or <header v-midday="{ onChange }">
 * In <script setup>, import as `vMidday` for auto-registration.
 */
export const vMidday: ObjectDirective<HTMLElement, MiddayOptions | undefined> = {
  mounted(el, binding) {
    const instance = createMidday(el, binding.value);
    (el as any).__middayInstance = instance;
  },
  unmounted(el) {
    (el as any).__middayInstance?.destroy();
    delete (el as any).__middayInstance;
  },
};
