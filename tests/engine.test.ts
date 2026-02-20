import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createEngine } from '../src/engine';
import type { EngineConfig, VariantState, SectionData } from '../src/types';
import { mockRect, setScrollY } from './helpers';

function makeVariant(name: string): VariantState {
  return { name, wrapper: document.createElement('div') };
}

/** Create a SectionData with pre-cached bounds (document-relative). */
function makeSection(
  variant: string,
  viewportRect: { top: number; height: number },
): SectionData {
  const el = document.createElement('div');
  mockRect(el, viewportRect);
  return {
    el,
    variant,
    top: viewportRect.top + window.scrollY,
    height: viewportRect.height,
  };
}

function createConfig(overrides: Partial<EngineConfig> = {}): EngineConfig {
  const header = document.createElement('header');
  mockRect(header, {
    top: 0,
    height: 60,
    bottom: 60,
    width: 1000,
    right: 1000,
  });
  return {
    header,
    variants: [makeVariant('default'), makeVariant('dark')],
    defaultName: 'default',
    sections: [],
    ...overrides,
  };
}

describe('createEngine — clip-path computation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setScrollY(0);
  });

  it('full section overlap → named variant fully visible, default hidden', () => {
    const config = createConfig({
      sections: [makeSection('dark', { top: 0, height: 400 })],
    });
    const engine = createEngine(config);

    const darkWrapper = config.variants.find((v) => v.name === 'dark')!.wrapper;
    const defaultWrapper = config.variants.find(
      (v) => v.name === 'default',
    )!.wrapper;

    expect(darkWrapper.style.clipPath).toBe('inset(0px 0 0px 0)');
    expect(defaultWrapper.style.clipPath).toBe('inset(0 0 100% 0)');
    engine.destroy();
  });

  it('no section overlap → default fully visible, named variants hidden', () => {
    const config = createConfig({
      sections: [makeSection('dark', { top: 1000, height: 400 })],
    });
    const engine = createEngine(config);

    const darkWrapper = config.variants.find((v) => v.name === 'dark')!.wrapper;
    const defaultWrapper = config.variants.find(
      (v) => v.name === 'default',
    )!.wrapper;

    expect(darkWrapper.style.clipPath).toBe('inset(0 0 100% 0)');
    expect(defaultWrapper.style.clipPath).toBe('inset(0)');
    engine.destroy();
  });

  it('partial overlap → correct inset values on both variants', () => {
    // Section starts at viewport y=30, overlaps bottom 30px of header (0-60)
    const config = createConfig({
      sections: [makeSection('dark', { top: 30, height: 400 })],
    });
    const engine = createEngine(config);

    const darkWrapper = config.variants.find((v) => v.name === 'dark')!.wrapper;
    const defaultWrapper = config.variants.find(
      (v) => v.name === 'default',
    )!.wrapper;

    // dark: topInset=30, bottomInset=0
    expect(darkWrapper.style.clipPath).toBe('inset(30px 0 0px 0)');
    // default: gapAbove=30 > gapBelow=0 → show top 30px
    expect(defaultWrapper.style.clipPath).toBe('inset(0 0 30px 0)');
    engine.destroy();
  });

  it('multiple sections → each variant gets correct clip region', () => {
    const config = createConfig({
      variants: [
        makeVariant('default'),
        makeVariant('dark'),
        makeVariant('light'),
      ],
      sections: [
        makeSection('dark', { top: 0, height: 30 }),
        makeSection('light', { top: 40, height: 400 }),
      ],
    });
    const engine = createEngine(config);

    const darkWrapper = config.variants.find((v) => v.name === 'dark')!.wrapper;
    const lightWrapper = config.variants.find(
      (v) => v.name === 'light',
    )!.wrapper;

    // dark covers top 30px: topInset=0, bottomInset=30
    expect(darkWrapper.style.clipPath).toBe('inset(0px 0 30px 0)');
    // light covers bottom 20px: topInset=40, bottomInset=0
    expect(lightWrapper.style.clipPath).toBe('inset(40px 0 0px 0)');
    engine.destroy();
  });

  it('scrolling into a section updates clip-paths', () => {
    // Section at document y=500 — initially no overlap with header (0-60)
    const config = createConfig({
      sections: [makeSection('dark', { top: 500, height: 400 })],
    });
    const engine = createEngine(config);

    const darkWrapper = config.variants.find((v) => v.name === 'dark')!.wrapper;
    const defaultWrapper = config.variants.find(
      (v) => v.name === 'default',
    )!.wrapper;

    // Initially: no overlap
    expect(darkWrapper.style.clipPath).toBe('inset(0 0 100% 0)');
    expect(defaultWrapper.style.clipPath).toBe('inset(0)');

    // Scroll so section enters header region: sectionViewTop = 500 - 470 = 30
    setScrollY(470);
    window.dispatchEvent(new Event('scroll'));

    // dark: topInset=30, bottomInset=0
    expect(darkWrapper.style.clipPath).toBe('inset(30px 0 0px 0)');
    // default: partial gap above
    expect(defaultWrapper.style.clipPath).toBe('inset(0 0 30px 0)');
    engine.destroy();
  });

  it('same-variant sections merge clip regions (min insets)', () => {
    // Two "dark" sections covering different header regions
    const config = createConfig({
      sections: [
        makeSection('dark', { top: 0, height: 30 }),  // covers 0-30px
        makeSection('dark', { top: 40, height: 400 }), // covers 40-60px
      ],
    });
    const engine = createEngine(config);

    const darkWrapper = config.variants.find((v) => v.name === 'dark')!.wrapper;

    // Merged: min(topInset=0,40)=0, min(bottomInset=30,0)=0 → fully visible
    expect(darkWrapper.style.clipPath).toBe('inset(0px 0 0px 0)');
    engine.destroy();
  });

  it('progress values are accurate (coverage / headerHeight)', () => {
    const onChange = vi.fn();
    // Section overlaps bottom 30px of 60px header → 50% progress
    const config = createConfig({
      sections: [makeSection('dark', { top: 30, height: 400 })],
      onChange,
    });
    const engine = createEngine(config);

    expect(onChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'dark', progress: 0.5 }),
        expect.objectContaining({ name: 'default', progress: 0.5 }),
      ]),
    );
    engine.destroy();
  });
});

describe('createEngine — onChange', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setScrollY(0);
  });

  it('fires when active variant set changes', () => {
    const onChange = vi.fn();
    const config = createConfig({
      sections: [makeSection('dark', { top: 1000, height: 400 })],
      onChange,
    });
    const engine = createEngine(config);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'default', progress: 1 }),
    ]);
    engine.destroy();
  });

  it('does NOT fire when variants unchanged (key-based diffing)', () => {
    const onChange = vi.fn();
    const config = createConfig({
      sections: [makeSection('dark', { top: 1000, height: 400 })],
      onChange,
    });
    const engine = createEngine(config);
    const initialCount = onChange.mock.calls.length;

    // Same scroll position → same active variants → no new onChange call
    window.dispatchEvent(new Event('scroll'));

    expect(onChange).toHaveBeenCalledTimes(initialCount);
    engine.destroy();
  });
});

describe('createEngine — destroy', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    setScrollY(0);
  });

  it('removes scroll and resize listeners', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const config = createConfig();
    const engine = createEngine(config);

    engine.destroy();

    const removedEvents = removeSpy.mock.calls.map((c) => c[0]);
    expect(removedEvents).toContain('scroll');
    expect(removedEvents).toContain('resize');
    removeSpy.mockRestore();
  });

  it('disconnects ResizeObserver', () => {
    const disconnectSpy = vi.spyOn(ResizeObserver.prototype, 'disconnect');
    const config = createConfig({
      sections: [makeSection('dark', { top: 0, height: 400 })],
    });
    const engine = createEngine(config);
    const countBefore = disconnectSpy.mock.calls.length;

    engine.destroy();

    expect(disconnectSpy.mock.calls.length).toBeGreaterThan(countBefore);
    disconnectSpy.mockRestore();
  });

  it('cancels pending rAF', () => {
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');
    const config = createConfig();
    const engine = createEngine(config);

    engine.destroy();

    expect(cancelSpy).toHaveBeenCalled();
    cancelSpy.mockRestore();
  });
});
