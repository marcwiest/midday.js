// ResizeObserver doesn't exist in happy-dom — stub globally
globalThis.ResizeObserver = class {
  constructor(_callback: ResizeObserverCallback) {}
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// Synchronous rAF so engine updates run immediately in tests
let _rafId = 0;
globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => {
  cb(performance.now());
  return ++_rafId;
};

globalThis.cancelAnimationFrame = () => {};
