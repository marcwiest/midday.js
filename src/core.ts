import type {
  MiddayOptions,
  MiddayInstance,
  SectionData,
  VariantState,
  ActiveVariant,
} from './types';
import { getHeaderBounds, cacheSectionBounds } from './utils';

const DEFAULTS: MiddayOptions = {
  defaultClass: 'default',
  sectionSelector: '[data-midday-section]',
  sectionAttr: 'data-midday-section',
  headerClass: 'midday-header',
  onChange: null,
};

export function createMidday(
  header: HTMLElement,
  userOptions: Partial<MiddayOptions> = {},
): MiddayInstance {
  const opts: MiddayOptions = { ...DEFAULTS, ...userOptions };

  let sections: SectionData[] = [];
  let variants: VariantState[] = [];
  let defaultVariant: VariantState | null = null;
  let rafId: number | null = null;
  let needsUpdate = true;
  let resizeObserver: ResizeObserver | null = null;
  let previousActive: string = '';

  // Store original header content and styles for destroy()
  const originalHTML = header.innerHTML;
  const originalPosition = header.style.position;
  const originalOverflow = header.style.overflow;

  function init(): void {
    scanSections();
    buildVariants();
    setupObservers();
    // Run first update immediately
    needsUpdate = true;
    tick();
  }

  function scanSections(): void {
    const els = document.querySelectorAll(opts.sectionSelector);
    sections = [];
    for (const el of els) {
      const variant = el.getAttribute(opts.sectionAttr);
      if (variant) {
        sections.push({ el, variant, top: 0, height: 0 });
      }
    }
    cacheSectionBounds(sections);
  }

  function buildVariants(): void {
    // Collect unique variant names
    const variantNames = new Set<string>();
    for (const s of sections) {
      variantNames.add(s.variant);
    }

    // Ensure the header doesn't clip its own children
    header.style.overflow = 'visible';

    // Store original children as a template
    const template = document.createDocumentFragment();
    while (header.firstChild) {
      template.appendChild(header.firstChild);
    }

    // Build clone wrappers first (while template is still intact for cloning)
    const cloneVariants: VariantState[] = [];
    for (const name of variantNames) {
      const variant = createVariantWrapper(name, template, true);
      cloneVariants.push(variant);
    }

    // Build default variant last — uses original nodes (preserves event listeners)
    defaultVariant = createVariantWrapper(opts.defaultClass, template, false);
    header.appendChild(defaultVariant.wrapper);
    variants = [defaultVariant];

    // Append clones on top of the default
    for (const variant of cloneVariants) {
      header.appendChild(variant.wrapper);
      variants.push(variant);
    }
  }

  function createVariantWrapper(
    name: string,
    template: DocumentFragment,
    isClone: boolean,
  ): VariantState {
    const wrapper = document.createElement('div');
    wrapper.className = `${opts.headerClass} ${name}`;
    wrapper.style.position = 'absolute';
    wrapper.style.top = '0';
    wrapper.style.left = '0';
    wrapper.style.right = '0';
    wrapper.style.bottom = '0';
    wrapper.style.willChange = 'clip-path';
    wrapper.style.clipPath = 'inset(0 0 100% 0)'; // hidden by default

    if (isClone) {
      wrapper.setAttribute('aria-hidden', 'true');
      wrapper.setAttribute('inert', '');
      wrapper.style.pointerEvents = 'none';
      wrapper.appendChild(template.cloneNode(true));
    } else {
      // The default/accessible variant gets the original nodes (preserves event listeners)
      wrapper.appendChild(template);
    }

    return { wrapper, name };
  }

  function setupObservers(): void {
    // Scroll-triggered RAF
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });

    // ResizeObserver for section size changes
    resizeObserver = new ResizeObserver(() => {
      cacheSectionBounds(sections);
      scheduleUpdate();
    });
    for (const s of sections) {
      resizeObserver.observe(s.el);
    }
  }

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
    const headerTop = headerRect.top + window.scrollY;
    const headerHeight = headerRect.height;
    const scrollY = window.scrollY;

    // The header's viewport position
    const headerViewTop = headerRect.top;
    const headerViewBottom = headerViewTop + headerHeight;

    // Track how much of the header is covered by section variants
    let coveredPx = 0;
    const activeVariants: ActiveVariant[] = [];

    // Map variant name -> inset values (in px from top and bottom of header)
    const clipMap = new Map<string, { topInset: number; bottomInset: number }>();

    for (const section of sections) {
      // Section position in viewport
      const sectionViewTop = section.top - scrollY;
      const sectionViewBottom = sectionViewTop + section.height;

      // Calculate overlap between section and header in viewport coords
      const overlapTop = Math.max(headerViewTop, sectionViewTop);
      const overlapBottom = Math.min(headerViewBottom, sectionViewBottom);
      const overlapPx = Math.max(0, overlapBottom - overlapTop);

      if (overlapPx <= 0) continue;

      coveredPx += overlapPx;

      // Convert overlap to inset values relative to the header
      const topInset = overlapTop - headerViewTop;
      const bottomInset = headerViewBottom - overlapBottom;

      // A variant may appear in multiple sections, merge by expanding the clip
      const existing = clipMap.get(section.variant);
      if (existing) {
        existing.topInset = Math.min(existing.topInset, topInset);
        existing.bottomInset = Math.min(existing.bottomInset, bottomInset);
      } else {
        clipMap.set(section.variant, { topInset, bottomInset });
      }
    }

    // Apply clip-paths to each variant
    for (const variant of variants) {
      if (variant.name === opts.defaultClass) continue; // handle default separately
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

    // Default variant fills whatever the section variants don't cover
    if (defaultVariant) {
      if (coveredPx >= headerHeight) {
        defaultVariant.wrapper.style.clipPath = 'inset(0 0 100% 0)';
      } else {
        defaultVariant.wrapper.style.clipPath = 'inset(0)';
      }
      if (coveredPx < headerHeight) {
        activeVariants.unshift({
          name: opts.defaultClass,
          progress: (headerHeight - coveredPx) / headerHeight,
        });
      }
    }

    // Fire onChange if the active variant set changed
    const activeKey = activeVariants.map((v) => `${v.name}:${v.progress.toFixed(3)}`).join('|');
    if (activeKey !== previousActive) {
      previousActive = activeKey;
      opts.onChange?.(activeVariants);
    }
  }

  function refresh(): void {
    // Tear down current variant DOM
    for (const v of variants) {
      v.wrapper.remove();
    }
    variants = [];
    defaultVariant = null;

    // Disconnect observers from old sections
    resizeObserver?.disconnect();

    // Rebuild
    scanSections();
    buildVariants();

    // Re-observe new sections
    for (const s of sections) {
      resizeObserver?.observe(s.el);
    }

    scheduleUpdate();
  }

  function destroy(): void {
    // Cancel RAF
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }

    // Remove listeners
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);

    // Disconnect observers
    resizeObserver?.disconnect();
    resizeObserver = null;

    // Remove variant wrappers and restore original content
    for (const v of variants) {
      v.wrapper.remove();
    }
    variants = [];
    defaultVariant = null;
    sections = [];

    // Restore original header
    header.innerHTML = originalHTML;
    header.style.position = originalPosition;
    header.style.overflow = originalOverflow;
  }

  // Initialize
  init();

  return { refresh, destroy };
}
