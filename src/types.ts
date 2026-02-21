// --- Shared types ---

export interface ActiveVariant {
  /** The variant name (from data-midday-section value) */
  name: string;
  /** How much of the element this variant covers (0 to 1) */
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

// --- Auto mode types ---

export interface MiddayOptions {
  /** Instance name for multi-instance scoping. Sections with a matching data-midday-target will be claimed by this instance. Defaults to the element's data-midday-element attribute value. */
  name?: string;
  /** Called when the set of visible variants changes */
  onChange?: ((variants: ActiveVariant[]) => void) | null;
}

// --- Headless mode types ---

export interface MiddayHeadlessOptions {
  /** The fixed/sticky element (used for position calculations) */
  element: HTMLElement;
  /** Map of variant name to wrapper element. The plugin manages clip-paths on these. */
  variants: Record<string, HTMLElement>;
  /** Which key in `variants` is the default (shown where no section overlaps). Defaults to 'default'. */
  defaultVariant?: string;
  /** Instance name for multi-instance scoping. Sections with a matching data-midday-target will be claimed by this instance. */
  name?: string;
  /** Called when the set of visible variants changes */
  onChange?: ((variants: ActiveVariant[]) => void) | null;
}

// --- Engine types (internal) ---

export interface EngineConfig {
  element: HTMLElement;
  variants: VariantState[];
  defaultName: string;
  sections: SectionData[];
  onChange?: ((variants: ActiveVariant[]) => void) | null;
}

export interface Engine {
  recalculate: () => void;
  update: (variants: VariantState[], sections: SectionData[]) => void;
  destroy: () => void;
}
