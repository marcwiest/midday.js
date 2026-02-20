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

    // Header-relative coverage tracking for default variant gap computation.
    const clipMap = new Map<string, { topInset: number; bottomInset: number }>();
    let coverageMin = headerHeight;
    let coverageMax = 0;
    let coveredPx = 0;

    // Collect section viewport positions per variant name for per-variant overlap.
    const sectionViews = new Map<string, { viewTop: number; viewBottom: number }[]>();

    for (const section of sections) {
      const sectionViewTop = section.top - scrollY;
      const sectionViewBottom = sectionViewTop + section.height;

      // Header-relative overlap (for default variant coverage + progress)
      const overlapTop = Math.max(headerViewTop, sectionViewTop);
      const overlapBottom = Math.min(headerViewBottom, sectionViewBottom);
      const overlapPx = Math.max(0, overlapBottom - overlapTop);

      if (overlapPx > 0) {
        coveredPx += overlapPx;
        const topInset = overlapTop - headerViewTop;
        const bottomInset = headerViewBottom - overlapBottom;
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

      // Store section view positions for per-variant clip computation
      let list = sectionViews.get(section.variant);
      if (!list) {
        list = [];
        sectionViews.set(section.variant, list);
      }
      list.push({ viewTop: sectionViewTop, viewBottom: sectionViewBottom });
    }

    let defaultWrapper: HTMLElement | null = null;

    for (const variant of variants) {
      if (variant.name === defaultName) {
        defaultWrapper = variant.wrapper;
        continue;
      }

      const views = sectionViews.get(variant.name);
      if (!views) {
        variant.wrapper.style.clipPath = 'inset(0 0 100% 0)';
        continue;
      }

      // Compute overlap using the variant's own bounds.
      // This ensures the clip edge tracks the section boundary exactly,
      // even when the variant is taller than the header. Extra height
      // only reveals when the section actually extends past the header edge.
      const variantRect = variant.wrapper.getBoundingClientRect();
      const vHeight = variantRect.height || headerHeight;
      let adjTop = vHeight;
      let adjBottom = vHeight;

      for (const sv of views) {
        const oTop = Math.max(variantRect.top, sv.viewTop);
        const oBottom = Math.min(variantRect.bottom, sv.viewBottom);
        if (oBottom <= oTop) continue;
        adjTop = Math.min(adjTop, oTop - variantRect.top);
        adjBottom = Math.min(adjBottom, variantRect.bottom - oBottom);
      }

      if (adjTop + adjBottom < vHeight) {
        variant.wrapper.style.clipPath = `inset(${adjTop}px 0 ${adjBottom}px 0)`;
        // Progress uses header-relative overlap for a meaningful 0–1 range
        const headerClip = clipMap.get(variant.name);
        const progress = headerClip
          ? (headerHeight - headerClip.topInset - headerClip.bottomInset) / headerHeight
          : 0;
        activeVariants.push({ name: variant.name, progress });
      } else {
        variant.wrapper.style.clipPath = 'inset(0 0 100% 0)';
      }
    }

    // Default variant: clip to only the GAPS not covered by named variants.
    if (defaultWrapper) {
      const defaultHeight = defaultWrapper.getBoundingClientRect().height || headerHeight;

      if (coveredPx >= headerHeight) {
        defaultWrapper.style.clipPath = 'inset(0 0 100% 0)';
      } else if (coveredPx <= 0) {
        defaultWrapper.style.clipPath = 'inset(0)';
        activeVariants.unshift({
          name: defaultName,
          progress: 1,
        });
      } else {
        // Partial coverage — show default in the gap.
        // Scale insets proportionally to default variant height.
        const gapAbove = coverageMin;
        const gapBelow = headerHeight - coverageMax;

        if (gapBelow >= gapAbove) {
          const adjTop = defaultHeight * (coverageMax / headerHeight);
          defaultWrapper.style.clipPath = `inset(${adjTop}px 0 0 0)`;
        } else {
          const adjBottom = defaultHeight * ((headerHeight - coverageMin) / headerHeight);
          defaultWrapper.style.clipPath = `inset(0 0 ${adjBottom}px 0)`;
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
