import { useEffect, useRef } from 'react';
import { createMidday } from './core';
import type { MiddayOptions, MiddayInstance } from './types';

/**
 * React hook for midday.js (auto mode).
 * Initializes on mount, destroys on unmount.
 * Cloning happens client-side — safe for SSR.
 */
export function useMidday(
  elementRef: React.RefObject<HTMLElement | null>,
  options?: MiddayOptions,
): React.RefObject<MiddayInstance | null> {
  const instanceRef = useRef<MiddayInstance | null>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    instanceRef.current = createMidday(elementRef.current, options);

    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, []);

  return instanceRef;
}
