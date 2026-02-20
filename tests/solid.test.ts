import { describe, it, expect, beforeEach, vi } from 'vitest';

let mountCb: (() => void) | null = null;
let cleanupCbs: Array<() => void> = [];

vi.mock('solid-js', () => ({
  onMount: vi.fn((cb: () => void) => {
    mountCb = cb;
  }),
  onCleanup: vi.fn((cb: () => void) => {
    cleanupCbs.push(cb);
  }),
}));

import { createMidday, midday } from '../src/solid';

function mockRect(el: Element, rect: Partial<DOMRect>) {
  el.getBoundingClientRect = () =>
    ({
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON() {},
      ...rect,
    }) as DOMRect;
}

function setScrollY(value: number) {
  Object.defineProperty(window, 'scrollY', {
    value,
    writable: true,
    configurable: true,
  });
}

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

describe('solid adapter — createMidday', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setScrollY(0);
    mountCb = null;
    cleanupCbs = [];
  });

  it('registers onMount and onCleanup hooks', () => {
    const header = setupHeader();
    createMidday(() => header);

    expect(mountCb).toBeTypeOf('function');
    expect(cleanupCbs.length).toBeGreaterThan(0);
  });

  it('creates instance in onMount', () => {
    const header = setupHeader();
    const getInstance = createMidday(() => header);

    expect(getInstance()).toBeNull();

    mountCb!();

    expect(getInstance()).not.toBeNull();
    expect(
      header.querySelectorAll('[data-midday-variant]').length,
    ).toBeGreaterThan(0);
  });

  it('skips init when accessor returns null', () => {
    const getInstance = createMidday(() => null);
    mountCb!();
    expect(getInstance()).toBeNull();
  });

  it('destroys instance in onCleanup', () => {
    const header = setupHeader();
    const getInstance = createMidday(() => header);

    mountCb!();
    expect(getInstance()).not.toBeNull();

    // The first onCleanup registered by createMidday
    cleanupCbs[0]();
    expect(getInstance()).toBeNull();
  });
});

describe('solid adapter — midday directive', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setScrollY(0);
    mountCb = null;
    cleanupCbs = [];
  });

  it('creates instance immediately (not deferred to onMount)', () => {
    const header = setupHeader();
    midday(header, () => undefined);

    expect(
      header.querySelectorAll('[data-midday-variant]').length,
    ).toBeGreaterThan(0);
  });

  it('registers onCleanup for teardown', () => {
    const header = setupHeader();
    midday(header, () => undefined);

    expect(cleanupCbs.length).toBeGreaterThan(0);

    cleanupCbs[0]();
    expect(header.querySelectorAll('[data-midday-variant]')).toHaveLength(0);
  });
});
