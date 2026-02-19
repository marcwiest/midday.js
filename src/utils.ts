import type { SectionData } from './types';

/**
 * Get a section's position relative to the document.
 * Uses getBoundingClientRect + scrollY for accuracy.
 */
export function getSectionBounds(el: Element): { top: number; height: number } {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    height: rect.height,
  };
}

/**
 * Get the header's current viewport-relative bounding rect.
 * This accounts for CSS transforms, sticky offsets, etc.
 */
export function getHeaderBounds(el: HTMLElement): { top: number; height: number } {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top,
    height: rect.height,
  };
}

/**
 * Calculate cached bounds for all tracked sections.
 */
export function cacheSectionBounds(sections: SectionData[]): void {
  for (const section of sections) {
    const bounds = getSectionBounds(section.el);
    section.top = bounds.top;
    section.height = bounds.height;
  }
}
