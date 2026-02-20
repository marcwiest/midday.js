import { describe, it, expect, beforeEach } from 'vitest';
import { createMidday } from '../src/core';

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

function setupDOM(headerAttrs = '', sections: string[] = []) {
  const headerHTML = '<span>Logo</span>';
  document.body.innerHTML = `
    <header ${headerAttrs}>${headerHTML}</header>
    ${sections.join('\n')}
  `;
  const header = document.querySelector('header') as HTMLElement;
  mockRect(header, { top: 0, height: 60, width: 1000, right: 1000, bottom: 60 });

  document.querySelectorAll('[data-midday-section]').forEach((el) => {
    mockRect(el, { top: 500, height: 400 });
  });
  setScrollY(0);
  return header;
}

describe('createMidday', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setScrollY(0);
  });

  it('creates one variant wrapper per unique section + default', () => {
    const header = setupDOM('data-midday', [
      '<section data-midday-section="dark"></section>',
      '<section data-midday-section="light"></section>',
    ]);
    createMidday(header);

    const wrappers = header.querySelectorAll('[data-midday-variant]');
    expect(wrappers).toHaveLength(3);
    const names = Array.from(wrappers).map((w) =>
      w.getAttribute('data-midday-variant'),
    );
    expect(names).toContain('default');
    expect(names).toContain('dark');
    expect(names).toContain('light');
  });

  it('default wrapper does NOT have aria-hidden or inert', () => {
    const header = setupDOM('data-midday', [
      '<section data-midday-section="dark"></section>',
    ]);
    createMidday(header);

    const defaultWrapper = header.querySelector(
      '[data-midday-variant="default"]',
    ) as HTMLElement;
    expect(defaultWrapper.getAttribute('aria-hidden')).toBeNull();
    expect(defaultWrapper.hasAttribute('inert')).toBe(false);
  });

  it('clone wrappers have aria-hidden="true", inert, pointer-events: none', () => {
    const header = setupDOM('data-midday', [
      '<section data-midday-section="dark"></section>',
    ]);
    createMidday(header);

    const clone = header.querySelector(
      '[data-midday-variant="dark"]',
    ) as HTMLElement;
    expect(clone.getAttribute('aria-hidden')).toBe('true');
    expect(clone.hasAttribute('inert')).toBe(true);
    expect(clone.style.pointerEvents).toBe('none');
  });

  it('all wrappers have position: absolute overlay styles', () => {
    const header = setupDOM('data-midday', [
      '<section data-midday-section="dark"></section>',
    ]);
    createMidday(header);

    const wrappers = header.querySelectorAll('[data-midday-variant]');
    for (const wrapper of wrappers) {
      const el = wrapper as HTMLElement;
      expect(el.style.position).toBe('absolute');
      expect(el.style.top).toBe('0px');
      expect(el.style.left).toBe('0px');
      expect(el.style.right).toBe('0px');
      expect(el.style.bottom).toBe('0px');
    }
  });

  it('sets header overflow to visible', () => {
    const header = setupDOM('data-midday', [
      '<section data-midday-section="dark"></section>',
    ]);
    createMidday(header);
    expect(header.style.overflow).toBe('visible');
  });

  it('destroy() removes all variant wrappers', () => {
    const header = setupDOM('data-midday', [
      '<section data-midday-section="dark"></section>',
    ]);
    const instance = createMidday(header);
    instance.destroy();

    const wrappers = header.querySelectorAll('[data-midday-variant]');
    expect(wrappers).toHaveLength(0);
  });

  it('destroy() restores original innerHTML', () => {
    const header = setupDOM('data-midday', [
      '<section data-midday-section="dark"></section>',
    ]);
    const originalHTML = header.innerHTML;
    const instance = createMidday(header);
    instance.destroy();

    expect(header.innerHTML).toBe(originalHTML);
  });

  it('destroy() restores header.style.overflow', () => {
    const header = setupDOM('data-midday', [
      '<section data-midday-section="dark"></section>',
    ]);
    header.style.overflow = 'hidden';
    const instance = createMidday(header);
    expect(header.style.overflow).toBe('visible');
    instance.destroy();
    expect(header.style.overflow).toBe('hidden');
  });

  it('refresh() rebuilds wrappers with updated sections', () => {
    const header = setupDOM('data-midday', [
      '<section data-midday-section="dark"></section>',
    ]);
    const instance = createMidday(header);

    const newSection = document.createElement('section');
    newSection.setAttribute('data-midday-section', 'light');
    mockRect(newSection, { top: 1000, height: 400 });
    document.body.appendChild(newSection);

    instance.refresh();

    const wrappers = header.querySelectorAll('[data-midday-variant]');
    expect(wrappers).toHaveLength(3);
    const names = Array.from(wrappers).map((w) =>
      w.getAttribute('data-midday-variant'),
    );
    expect(names).toContain('light');
  });

  it('options.name takes precedence over data-midday attribute', () => {
    const header = setupDOM('data-midday="nav"', [
      '<section data-midday-section="dark" data-midday-target="custom"></section>',
    ]);
    createMidday(header, { name: 'custom' });

    const wrappers = header.querySelectorAll('[data-midday-variant]');
    expect(wrappers).toHaveLength(2);
  });

  it('falls back to data-midday attribute when options.name not set', () => {
    const header = setupDOM('data-midday="nav"', [
      '<section data-midday-section="dark" data-midday-target="nav"></section>',
    ]);
    createMidday(header);

    const wrappers = header.querySelectorAll('[data-midday-variant]');
    expect(wrappers).toHaveLength(2);
  });
});
