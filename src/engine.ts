import type {
  EngineConfig,
  Engine,
  SectionData,
  VariantState,
  ActiveVariant,
} from './types';
import { getHeaderBounds, cacheSectionBounds } from './utils';

export function createEngine(config: EngineConfig): Engine {
  let { header, variants, sections } = config;
  const { defaultName, onChange } = config;

  let rafId: number | null = null;
  let needsUpdate = false;
  let previousActive = '';
  let resizeObserver: ResizeObserver | null = null;

  function onScroll(): void {
    scheduleUpdate();
  }

  function onResize(): void {
    cacheSectionBounds(sections);
    scheduleUpdate();
  }

  function scheduleUpdate(): void {
    if (!needsUpdate) {
      needsUpdate = true;
      rafId = requestAnimationFrame(tick);
    }
  }

  function tick(): void {
    needsUpdate = false;
    updateClipPaths();
  }

  function updateClipPaths(): void {
    const headerRect = getHeaderBounds(header);
    const headerHeight = headerRect.height;
    if (headerHeight <= 0) return;

    const scrollY = window.scrollY;
    const headerViewTop = headerRect.top;
    const headerViewBottom = headerViewTop + headerHeight;

    const activeVariants: ActiveVariant[] = [];
    const clipMap = new Map<string, { topInset: number; bottomInset: number }>();

    // Track the boundaries of all named variant coverage within the header.
    // Used to compute the default variant's clip (the inverse/gap).
    let coverageMin = headerHeight; // topmost covered pixel (relative to header)
    let coverageMax = 0;            // bottommost covered pixel (relative to header)
    let coveredPx = 0;

    for (const section of sections) {
      const sectionViewTop = section.top - scrollY;
      const sectionViewBottom = sectionViewTop + section.height;

      const overlapTop = Math.max(headerViewTop, sectionViewTop);
      const overlapBottom = Math.min(headerViewBottom, sectionViewBottom);
      const overlapPx = Math.max(0, overlapBottom - overlapTop);

      if (overlapPx <= 0) continue;

      coveredPx += overlapPx;

      const topInset = overlapTop - headerViewTop;
      const bottomInset = headerViewBottom - overlapBottom;

      // Track coverage boundaries for default variant computation
      coverageMin = Math.min(coverageMin, topInset);
      coverageMax = Math.max(coverageMax, headerHeight - bottomInset);

      const existing = clipMap.get(section.variant);
      if (existing) {
        existing.topInset = Math.min(existing.topInset, topInset);
        existing.bottomInset = Math.min(existing.bottomInset, bottomInset);
      } else {
        clipMap.set(section.variant, { topInset, bottomInset });
      }
    }

    let defaultWrapper: HTMLElement | null = null;

    for (const variant of variants) {
      if (variant.name === defaultName) {
        defaultWrapper = variant.wrapper;
        continue;
      }
      const clip = clipMap.get(variant.name);
      if (clip && clip.topInset + clip.bottomInset < headerHeight) {
        variant.wrapper.style.clipPath = `inset(${clip.topInset}px 0 ${clip.bottomInset}px 0)`;
        activeVariants.push({
          name: variant.name,
          progress: (headerHeight - clip.topInset - clip.bottomInset) / headerHeight,
        });
      } else {
        variant.wrapper.style.clipPath = 'inset(0 0 100% 0)';
      }
    }

    // Default variant: clip to only the GAPS not covered by named variants.
    // Instead of a full backdrop, the default only shows where no section variant exists.
    if (defaultWrapper) {
      if (coveredPx >= headerHeight) {
        // Named variants cover the entire header — hide default
        defaultWrapper.style.clipPath = 'inset(0 0 100% 0)';
      } else if (coveredPx <= 0) {
        // No named variants visible — show default fully
        defaultWrapper.style.clipPath = 'inset(0)';
        activeVariants.unshift({
          name: defaultName,
          progress: 1,
        });
      } else {
        // Partial coverage — show default in the gap.
        // Coverage spans from coverageMin to coverageMax (relative to header top).
        // The gap is on whichever side has uncovered space.
        const gapAbove = coverageMin;
        const gapBelow = headerHeight - coverageMax;

        if (gapBelow >= gapAbove) {
          // Gap is below coverage (named section leaving from top)
          defaultWrapper.style.clipPath = `inset(${coverageMax}px 0 0 0)`;
        } else {
          // Gap is above coverage (named section leaving from bottom)
          defaultWrapper.style.clipPath = `inset(0 0 ${headerHeight - coverageMin}px 0)`;
        }

        const defaultPx = headerHeight - coveredPx;
        activeVariants.unshift({
          name: defaultName,
          progress: defaultPx / headerHeight,
        });
      }
    }

    const activeKey = activeVariants.map((v) => `${v.name}:${v.progress.toFixed(3)}`).join('|');
    if (activeKey !== previousActive) {
      previousActive = activeKey;
      onChange?.(activeVariants);
    }
  }

  function observeSections(): void {
    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver(() => {
      cacheSectionBounds(sections);
      scheduleUpdate();
    });
    for (const s of sections) {
      resizeObserver.observe(s.el);
    }
  }

  function start(): void {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    observeSections();
    scheduleUpdate();
  }

  function recalculate(): void {
    cacheSectionBounds(sections);
    scheduleUpdate();
  }

  function update(newVariants: VariantState[], newSections: SectionData[]): void {
    variants = newVariants;
    sections = newSections;
    cacheSectionBounds(sections);
    observeSections();
    scheduleUpdate();
  }

  function destroy(): void {
    if (rafId !== null) cancelAnimationFrame(rafId);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    resizeObserver?.disconnect();
    resizeObserver = null;
  }

  start();

  return { recalculate, update, destroy };
}
