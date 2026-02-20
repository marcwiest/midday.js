import type {
  MiddayHeadlessOptions,
  MiddayInstance,
  VariantState,
  Engine,
} from './types';
import { scanSections } from './utils';
import { createEngine } from './engine';

export function createMiddayHeadless(
  options: MiddayHeadlessOptions,
): MiddayInstance {
  const {
    header,
    variants: variantMap,
    defaultVariant = 'default',
    name: instanceName,
    onChange,
  } = options;

  let engine: Engine | null = null;

  function toVariantStates(): VariantState[] {
    return Object.entries(variantMap).map(([name, wrapper]) => ({
      name,
      wrapper,
    }));
  }

  function init(): void {
    const sections = scanSections(instanceName);
    engine = createEngine({
      header,
      variants: toVariantStates(),
      defaultName: defaultVariant,
      sections,
      onChange,
    });
  }

  function refresh(): void {
    const sections = scanSections(instanceName);
    engine?.update(toVariantStates(), sections);
  }

  function destroy(): void {
    engine?.destroy();
    engine = null;
  }

  init();

  return { refresh, destroy };
}
