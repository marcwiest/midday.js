import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMiddayHeadless } from '../src/headless';
import { mockRect, setScrollY } from './helpers';

describe('createMiddayHeadless', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setScrollY(0);
  });

  it('does NOT modify header innerHTML', () => {
    const header = document.createElement('header');
    header.innerHTML = '<span>Logo</span>';
    mockRect(header, { top: 0, height: 60 });
    document.body.appendChild(header);

    const originalHTML = header.innerHTML;

    createMiddayHeadless({
      header,
      variants: {
        default: document.createElement('div'),
        dark: document.createElement('div'),
      },
    });

    expect(header.innerHTML).toBe(originalHTML);
  });

  it('applies clip-paths to provided variant elements', () => {
    const header = document.createElement('header');
    mockRect(header, { top: 0, height: 60 });
    document.body.appendChild(header);

    const section = document.createElement('section');
    section.setAttribute('data-midday-section', 'dark');
    mockRect(section, { top: 0, height: 400 });
    document.body.appendChild(section);

    const defaultEl = document.createElement('div');
    const darkEl = document.createElement('div');

    createMiddayHeadless({
      header,
      variants: { default: defaultEl, dark: darkEl },
    });

    expect(darkEl.style.clipPath).toBe('inset(0px 0 0px 0)');
    expect(defaultEl.style.clipPath).toBe('inset(0 0 100% 0)');
  });

  it('respects custom defaultVariant key', () => {
    const header = document.createElement('header');
    mockRect(header, { top: 0, height: 60 });
    document.body.appendChild(header);

    const baseEl = document.createElement('div');
    const darkEl = document.createElement('div');

    createMiddayHeadless({
      header,
      variants: { base: baseEl, dark: darkEl },
      defaultVariant: 'base',
    });

    expect(baseEl.style.clipPath).toBe('inset(0)');
    expect(darkEl.style.clipPath).toBe('inset(0 0 100% 0)');
  });

  it('destroy() cleans up engine listeners', () => {
    const header = document.createElement('header');
    mockRect(header, { top: 0, height: 60 });
    document.body.appendChild(header);

    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const instance = createMiddayHeadless({
      header,
      variants: { default: document.createElement('div') },
    });

    instance.destroy();

    const removedEvents = removeSpy.mock.calls.map((c) => c[0]);
    expect(removedEvents).toContain('scroll');
    expect(removedEvents).toContain('resize');
    removeSpy.mockRestore();
  });

  it('refresh() rescans sections', () => {
    const header = document.createElement('header');
    mockRect(header, { top: 0, height: 60 });
    document.body.appendChild(header);

    const defaultEl = document.createElement('div');
    const darkEl = document.createElement('div');

    const instance = createMiddayHeadless({
      header,
      variants: { default: defaultEl, dark: darkEl },
    });

    expect(defaultEl.style.clipPath).toBe('inset(0)');

    const section = document.createElement('section');
    section.setAttribute('data-midday-section', 'dark');
    mockRect(section, { top: 0, height: 400 });
    document.body.appendChild(section);

    instance.refresh();

    expect(darkEl.style.clipPath).toBe('inset(0px 0 0px 0)');
    expect(defaultEl.style.clipPath).toBe('inset(0 0 100% 0)');
  });

  it('name option scopes section scanning', () => {
    const header = document.createElement('header');
    mockRect(header, { top: 0, height: 60 });
    document.body.appendChild(header);

    const section = document.createElement('section');
    section.setAttribute('data-midday-section', 'dark');
    section.setAttribute('data-midday-target', 'top');
    mockRect(section, { top: 0, height: 400 });
    document.body.appendChild(section);

    // Without name — targeted section is excluded
    const defaultEl = document.createElement('div');
    const darkEl = document.createElement('div');
    createMiddayHeadless({
      header,
      variants: { default: defaultEl, dark: darkEl },
    });
    expect(defaultEl.style.clipPath).toBe('inset(0)');
    expect(darkEl.style.clipPath).toBe('inset(0 0 100% 0)');

    // With matching name — targeted section is included
    const defaultEl2 = document.createElement('div');
    const darkEl2 = document.createElement('div');
    createMiddayHeadless({
      header,
      variants: { default: defaultEl2, dark: darkEl2 },
      name: 'top',
    });
    expect(darkEl2.style.clipPath).toBe('inset(0px 0 0px 0)');
    expect(defaultEl2.style.clipPath).toBe('inset(0 0 100% 0)');
  });
});
