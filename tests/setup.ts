/**
 * Global test setup — mocks for APIs missing or unsuitable in happy-dom.
 *
 * Mock strategy:
 *   - Tests override `el.getBoundingClientRect()` per element and set
 *     `window.scrollY` via Object.defineProperty to simulate scroll positions.
 *   - happy-dom normalizes style values (e.g. `style.top = '0'` reads back
 *     as `'0px'`), so assertions should use the normalized form.
 *   - Framework adapter tests use `vi.mock()` to replace lifecycle hooks
 *     (useEffect, onMounted, onMount, etc.) with captured callbacks —
 *     no framework runtime or test utilities needed.
 */

// ResizeObserver doesn't exist in happy-dom — stub globally.
// The engine uses it to watch section resize; tests mock getBoundingClientRect
// directly, so the observer callbacks never need to fire.
globalThis.ResizeObserver = class {
  constructor(_callback: ResizeObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// Synchronous rAF so engine updates run immediately in tests.
// The engine uses scroll-triggered rAF batching (scheduleUpdate → tick →
// updateClipPaths). Making rAF synchronous means clip-paths are computed
// inline during createEngine() and dispatchEvent(new Event('scroll')),
// so tests can assert on style values without async/timer management.
let _rafId = 0;
globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => {
  cb(performance.now());
  return ++_rafId;
};

globalThis.cancelAnimationFrame = () => {};
