import type {
  MiddayHeadlessOptions,
  MiddayInstance,
  SectionData,
  VariantState,
  Engine,
} from './types';
import { cacheSectionBounds } from './utils';
import { createEngine } from './engine';

const SECTION_SELECTOR = '[data-midday-section]';
const SECTION_ATTR = 'data-midday-section';

export function createMiddayHeadless(
  options: MiddayHeadlessOptions,
): MiddayInstance {
  const {
    header,
    variants: variantMap,
    defaultVariant = 'default',
    onChange,
  } = options;

  let engine: Engine | null = null;

  function scanSections(): SectionData[] {
    const els = document.querySelectorAll(SECTION_SELECTOR);
    const sections: SectionData[] = [];
    for (const el of els) {
      const variant = el.getAttribute(SECTION_ATTR);
      if (variant) {
        sections.push({ el, variant, top: 0, height: 0 });
      }
    }
    cacheSectionBounds(sections);
    return sections;
  }

  function toVariantStates(): VariantState[] {
    return Object.entries(variantMap).map(([name, wrapper]) => ({
      name,
      wrapper,
    }));
  }

  function init(): void {
    const sections = scanSections();
    engine = createEngine({
      header,
      variants: toVariantStates(),
      defaultName: defaultVariant,
      sections,
      onChange,
    });
  }

  function refresh(): void {
    const sections = scanSections();
    engine?.update(toVariantStates(), sections);
  }

  function destroy(): void {
    engine?.destroy();
    engine = null;
  }

  init();

  return { refresh, destroy };
}
