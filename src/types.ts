export interface MiddayOptions {
  /** Class applied to areas where no section variant is active */
  defaultClass: string;
  /** CSS selector to find section elements */
  sectionSelector: string;
  /** Data attribute on sections that holds the variant name */
  sectionAttr: string;
  /** Class added to each variant wrapper element */
  headerClass: string;
  /** Called when the set of visible variants changes */
  onChange: ((variants: ActiveVariant[]) => void) | null;
}

export interface ActiveVariant {
  /** The variant name (from data attribute) */
  name: string;
  /** How much of the header this variant covers (0 to 1) */
  progress: number;
}

export interface MiddayInstance {
  /** Re-scan sections and recalculate positions. Call after DOM changes. */
  refresh: () => void;
  /** Full teardown: remove clones, observers, listeners, restore original DOM. */
  destroy: () => void;
}

export interface SectionData {
  el: Element;
  variant: string;
  top: number;
  height: number;
}

export interface VariantState {
  wrapper: HTMLElement;
  name: string;
}
