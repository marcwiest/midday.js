import { onMounted, onUnmounted, shallowRef, type Ref } from 'vue';
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
