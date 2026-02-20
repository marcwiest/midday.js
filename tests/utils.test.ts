import { describe, it, expect, beforeEach } from 'vitest';
import {
  scanSections,
  getSectionBounds,
  getHeaderBounds,
  cacheSectionBounds,
} from '../src/utils';
import type { SectionData } from '../src/types';

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

describe('scanSections', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setScrollY(0);
  });

  it('returns all [data-midday-section] elements', () => {
    document.body.innerHTML = `
      <div data-midday-section="dark"></div>
      <div data-midday-section="light"></div>
    `;
    const sections = scanSections();
    expect(sections).toHaveLength(2);
    expect(sections[0].variant).toBe('dark');
    expect(sections[1].variant).toBe('light');
  });

  it('skips elements without a variant value', () => {
    document.body.innerHTML = `
      <div data-midday-section=""></div>
      <div data-midday-section="dark"></div>
    `;
    const sections = scanSections();
    expect(sections).toHaveLength(1);
    expect(sections[0].variant).toBe('dark');
  });

  it('with instanceName includes untargeted sections', () => {
    document.body.innerHTML = `
      <div data-midday-section="dark"></div>
    `;
    const sections = scanSections('top');
    expect(sections).toHaveLength(1);
  });

  it('with instanceName includes sections with matching target', () => {
    document.body.innerHTML = `
      <div data-midday-section="dark" data-midday-target="top"></div>
    `;
    const sections = scanSections('top');
    expect(sections).toHaveLength(1);
  });

  it('with instanceName excludes sections with non-matching target', () => {
    document.body.innerHTML = `
      <div data-midday-section="dark" data-midday-target="bottom"></div>
    `;
    const sections = scanSections('top');
    expect(sections).toHaveLength(0);
  });

  it('with instanceName handles space-separated targets', () => {
    document.body.innerHTML = `
      <div data-midday-section="dark" data-midday-target="top bottom"></div>
    `;
    expect(scanSections('top')).toHaveLength(1);
    expect(scanSections('bottom')).toHaveLength(1);
    expect(scanSections('other')).toHaveLength(0);
  });

  it('without instanceName excludes targeted sections', () => {
    document.body.innerHTML = `
      <div data-midday-section="dark" data-midday-target="top"></div>
      <div data-midday-section="light"></div>
    `;
    const sections = scanSections();
    expect(sections).toHaveLength(1);
    expect(sections[0].variant).toBe('light');
  });
});

describe('getSectionBounds', () => {
  it('returns rect.top + scrollY and rect.height', () => {
    const el = document.createElement('div');
    mockRect(el, { top: 100, height: 300 });
    setScrollY(200);

    const bounds = getSectionBounds(el);
    expect(bounds.top).toBe(300);
    expect(bounds.height).toBe(300);
  });
});

describe('getHeaderBounds', () => {
  it('returns viewport-relative rect.top and rect.height', () => {
    const el = document.createElement('div') as HTMLElement;
    mockRect(el, { top: 10, height: 60 });

    const bounds = getHeaderBounds(el);
    expect(bounds.top).toBe(10);
    expect(bounds.height).toBe(60);
  });
});

describe('cacheSectionBounds', () => {
  it('mutates sections array in place', () => {
    const el = document.createElement('div');
    mockRect(el, { top: 50, height: 200 });
    setScrollY(100);

    const sections: SectionData[] = [
      { el, variant: 'dark', top: 0, height: 0 },
    ];

    cacheSectionBounds(sections);
    expect(sections[0].top).toBe(150);
    expect(sections[0].height).toBe(200);
  });
});
