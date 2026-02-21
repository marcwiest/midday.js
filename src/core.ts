import type {
  MiddayOptions,
  MiddayInstance,
  VariantState,
  Engine,
} from './types';
import { scanSections } from './utils';
import { createEngine } from './engine';

const VARIANT_ATTR = 'data-midday-variant';
const DEFAULT_NAME = 'default';

export function createMidday(
  element: HTMLElement,
  options: MiddayOptions = {},
): MiddayInstance {
  const { onChange } = options;
  const instanceName = options.name ?? (element.getAttribute('data-midday-element') || undefined);

  // Store original state for destroy()
  const originalHTML = element.innerHTML;
  const originalOverflow = element.style.overflow;

  let engine: Engine | null = null;
  let variants: VariantState[] = [];

  function buildVariants(): VariantState[] {
    const sections = scanSections(instanceName);
    const variantNames = new Set<string>();
    for (const s of sections) {
      variantNames.add(s.variant);
    }

    element.style.overflow = 'visible';

    const template = document.createDocumentFragment();
    while (element.firstChild) {
      template.appendChild(element.firstChild);
    }

    // Build clone wrappers first (while template nodes are intact for cloning)
    const clones: VariantState[] = [];
    for (const name of variantNames) {
      clones.push(createWrapper(name, template, true));
    }

    // Sizing ghost: invisible clone in normal flow that drives the element's
    // height. Responds to media queries, font loading, etc. without JS
    // re-measurement. The absolute variant wrappers overlay it.
    // Must clone before the default wrapper moves the template nodes.
    const ghost = document.createElement('div');
    ghost.style.visibility = 'hidden';
    ghost.style.pointerEvents = 'none';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.appendChild(template.cloneNode(true));
    element.appendChild(ghost);

    // Build default wrapper last — uses original nodes (preserves event listeners)
    const defaultVariant = createWrapper(DEFAULT_NAME, template, false);

    element.appendChild(defaultVariant.wrapper);

    const allVariants = [defaultVariant];
    for (const clone of clones) {
      element.appendChild(clone.wrapper);
      allVariants.push(clone);
    }

    return allVariants;
  }

  function createWrapper(
    name: string,
    template: DocumentFragment,
    isClone: boolean,
  ): VariantState {
    const wrapper = document.createElement('div');
    wrapper.setAttribute(VARIANT_ATTR, name);
    wrapper.style.position = 'absolute';
    wrapper.style.top = '0';
    wrapper.style.left = '0';
    wrapper.style.right = '0';
    wrapper.style.bottom = '0';
    wrapper.style.willChange = 'clip-path';
    wrapper.style.clipPath = 'inset(0 0 100% 0)';

    if (isClone) {
      wrapper.setAttribute('aria-hidden', 'true');
      wrapper.setAttribute('inert', '');
      wrapper.style.pointerEvents = 'none';
      wrapper.appendChild(template.cloneNode(true));
    } else {
      wrapper.appendChild(template);
    }

    return { wrapper, name };
  }

  function init(): void {
    const sections = scanSections(instanceName);
    variants = buildVariants();
    engine = createEngine({
      element,
      variants,
      defaultName: DEFAULT_NAME,
      sections,
      onChange,
    });
  }

  function refresh(): void {
    for (const v of variants) {
      v.wrapper.remove();
    }
    // Restore original content so buildVariants() has children to template from
    element.innerHTML = originalHTML;
    const sections = scanSections(instanceName);
    variants = buildVariants();
    engine?.update(variants, sections);
  }

  function destroy(): void {
    engine?.destroy();
    engine = null;

    for (const v of variants) {
      v.wrapper.remove();
    }
    variants = [];

    element.innerHTML = originalHTML;
    element.style.overflow = originalOverflow;
  }

  init();

  return { refresh, destroy };
}
