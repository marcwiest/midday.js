import { describe, it, expect, beforeEach, vi } from 'vitest';

let effectSetup: (() => (() => void) | void) | null = null;

vi.mock('react', () => ({
  useEffect: vi.fn((setup: () => (() => void) | void) => {
    effectSetup = setup;
  }),
  useRef: vi.fn((initial: unknown) => ({ current: initial })),
}));

import { useMidday } from '../src/react';
import { mockRect, setScrollY } from './helpers';

function setupHeader(): HTMLElement {
  const header = document.createElement('header');
  header.innerHTML = '<span>Logo</span>';
  mockRect(header, { top: 0, height: 60, bottom: 60, width: 1000, right: 1000 });
  document.body.appendChild(header);

  const section = document.createElement('section');
  section.setAttribute('data-midday-section', 'dark');
  mockRect(section, { top: 500, height: 400 });
  document.body.appendChild(section);

  return header;
}

describe('react adapter — useMidday hook', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setScrollY(0);
    effectSetup = null;
  });

  it('registers a useEffect', () => {
    const header = setupHeader();
    useMidday({ current: header } as any);

    expect(effectSetup).toBeTypeOf('function');
  });

  it('creates instance when effect runs', () => {
    const header = setupHeader();
    const instanceRef = useMidday({ current: header } as any);

    // Effect hasn't run yet
    expect(instanceRef.current).toBeNull();

    // Simulate mount
    effectSetup!();

    expect(instanceRef.current).not.toBeNull();
    expect(
      header.querySelectorAll('[data-midday-variant]').length,
    ).toBeGreaterThan(0);
  });

  it('skips init when elementRef.current is null', () => {
    const instanceRef = useMidday({ current: null } as any);
    effectSetup!();
    expect(instanceRef.current).toBeNull();
  });

  it('cleanup destroys instance', () => {
    const header = setupHeader();
    const instanceRef = useMidday({ current: header } as any);

    const cleanup = effectSetup!() as () => void;
    expect(instanceRef.current).not.toBeNull();

    cleanup();
    expect(instanceRef.current).toBeNull();
  });
});
