# midday.js

[![npm version](https://img.shields.io/npm/v/@marcwiest/midday.js)](https://www.npmjs.com/package/@marcwiest/midday.js)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@marcwiest/midday.js)](https://bundlephobia.com/package/@marcwiest/midday.js)
[![CI](https://github.com/marcwiest/midday.js/actions/workflows/ci.yml/badge.svg)](https://github.com/marcwiest/midday.js/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A modern, zero-dependency vanilla JS plugin for fixed elements that change style as you scroll through page sections. The spiritual successor to [midnight.js](https://github.com/Aerolab/midnight.js).

**~1 kB gzipped** (auto mode) | TypeScript | Framework adapters (React, Vue, Svelte, Solid) included

**[Live Demo](https://marcwiest.github.io/midday.js/)**

## Background

[midnight.js](https://aerolab.github.io/midnight.js/) (2014) introduced a great UI pattern: a fixed header that smoothly transitions between visual styles as page sections scroll beneath it. The transition is a pixel-perfect wipe that follows the section boundary, not an abrupt class swap. midday.js implements the same effect using the browser APIs available today:

- **`clip-path: inset()`** for GPU-composited clipping (replaces the nested `overflow: hidden` + opposing `translateY` technique)
- **`ResizeObserver`** to track section dimensions reactively (replaces interval-based polling)
- **Scroll-triggered `requestAnimationFrame`** that idles when the user isn't scrolling
- **`aria-hidden` + `inert`** on cloned variants for screen reader and keyboard accessibility
- Full **`destroy()` / `refresh()`** lifecycle for clean teardown and dynamic content
- Zero dependencies, ~1 kB gzipped, TypeScript, framework adapters for React / Vue / Svelte / Solid

## Install

```bash
npm install @marcwiest/midday.js
```

Or via CDN (UMD):

```html
<script src="https://unpkg.com/@marcwiest/midday.js/dist/midday.umd.js"></script>
```

## Quick Start

### 1. Mark your element, add your sections

Add `data-midday-element` to your fixed element. Each section declares which variant it wants via `data-midday-section`:

```html
<header data-midday-element>
  <nav>
    <a href="/" class="logo">Logo</a>
    <a href="/about">About</a>
    <a href="/contact">Contact</a>
  </nav>
</header>

<section data-midday-section="dark">
  <!-- Dark hero — header should have white text here -->
</section>

<section>
  <!-- No attribute — header uses its default style -->
</section>

<section data-midday-section="accent">
  <!-- Purple section — header should match -->
</section>
```

### 2. Initialize

```js
import { midday } from '@marcwiest/midday.js';

const instance = midday(document.querySelector('[data-midday-element]'));
```

### 3. What happens next

The plugin reads every unique `data-midday-section` value on the page (`"dark"`, `"accent"`) and clones your element's content once per variant. Each clone is wrapped in a container with a `data-midday-variant` attribute. Your original HTML stays as-is — the clones are created at runtime:

```
<header data-midday-element>                       ← your element (position: fixed)
  <div data-midday-variant="default">              ← default style (original content)
    <nav>Logo, About, Contact</nav>
  </div>
  <div data-midday-variant="dark">                 ← clone for "dark" sections
    <nav>Logo, About, Contact</nav>
  </div>
  <div data-midday-variant="accent">               ← clone for "accent" sections
    <nav>Logo, About, Contact</nav>
  </div>
</header>
```

As you scroll, the plugin shows and hides portions of each clone using `clip-path`, creating a smooth wipe transition at every section boundary.

### 4. Style each variant

Target variant wrappers with `[data-midday-variant="..."]`. Style them however you want:

```css
header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

/* Shown over sections without data-midday-section */
[data-midday-variant="default"] {
  background: white;
  color: #111;
}

/* Shown over data-midday-section="dark" */
[data-midday-variant="dark"] {
  background: #111;
  color: white;
}

/* Shown over data-midday-section="accent" */
[data-midday-variant="accent"] {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}
```

That's it. Scroll through your sections and the element transitions smoothly from one variant to another.

## API

### `midday(element, options?)` — Auto mode

Clones your element's content once per variant and manages everything. Sections are discovered automatically via `data-midday-section` attributes.

```js
const instance = midday(document.querySelector('[data-midday-element]'));

// With optional onChange callback:
const instance = midday(document.querySelector('[data-midday-element]'), {
  onChange: (variants) => console.log(variants),
});
```

### `middayHeadless(options)` — Headless mode

You provide pre-rendered variant elements. The plugin only manages `clip-path` values. No DOM cloning. Use this when you need **different markup** (not just different styles) per variant.

```js
import { middayHeadless } from '@marcwiest/midday.js';

const instance = middayHeadless({
  element: document.querySelector('header'),
  variants: {
    default: document.querySelector('.header-default'),
    dark: document.querySelector('.header-dark'),
  },
  defaultVariant: 'default',  // Which key in `variants` is the fallback (optional, defaults to 'default')
  onChange: (variants) => {},  // Optional
});
```

### Instance methods

Both modes return the same instance:

```js
instance.refresh();  // Rebuild variants and re-scan sections
instance.destroy();  // Full teardown — removes clones, listeners, observers
```

**When to call `refresh()`** — in both modes, call it when sections are added, removed, or reordered in the DOM. Beyond that, the two modes differ:

**Auto mode** clones element content at init time. The clones and an internal sizing ghost are frozen snapshots of the element's DOM. CSS-driven size changes (media queries, viewport resize, font loading) are handled automatically — the sizing ghost is a real DOM node in normal flow and reflows with the page. But if the element's HTML content changes (nav items added/removed, conditional elements toggled), call `refresh()` to rebuild the clones and sizing ghost from the current DOM.

Framework adapters initialize once on mount and don't auto-detect content changes. If your element's content is dynamic, call `refresh()` after updates:

```jsx
// React example
const instance = useMidday(elementRef);

useEffect(() => {
  instance.current?.refresh();
}, [navItems]);
```

**Section changes are not auto-detected.** The library uses `ResizeObserver` to track section and element *sizes*, but it does not watch for new or removed `[data-midday-section]` elements. In SPAs or pages with dynamic sections, call `refresh()` after route changes or any DOM mutation that adds, removes, or reorders sections.

**Headless mode** doesn't manage element DOM — you own the variant elements. The engine reads element and variant sizes live on every scroll frame via `getBoundingClientRect()`, so size changes to your variant elements are picked up automatically. You only need `refresh()` when sections change, since section bounds are cached.

### `onChange` callback

Fires whenever the set of visible variants changes:

```js
midday(element, {
  onChange: (variants) => {
    // variants: Array<{ name: string, progress: number }>
    // progress: 0–1, how much of the element this variant covers
    console.log(variants);
    // e.g. [{ name: 'dark', progress: 0.7 }, { name: 'default', progress: 0.3 }]
  },
});
```

## Framework Adapters

Each adapter is a separate tree-shakable entry point (~0.2 kB gzipped). Import only the one you need — the others are never bundled.

The adapters wrap **auto mode** — your component renders a single element, and cloning happens client-side on mount. This means your server-rendered HTML stays clean (see [SSR & SEO](#ssr--seo) below).

### React

```jsx
import { useRef } from 'react';
import { useMidday } from '@marcwiest/midday.js/react';

function Header() {
  const elementRef = useRef(null);
  useMidday(elementRef);

  return (
    <header ref={elementRef} style={{ position: 'fixed', top: 0, left: 0, right: 0 }}>
      <Nav />
    </header>
  );
}
```

### Vue

Composable:

```html
<script setup>
import { ref } from 'vue';
import { useMidday } from '@marcwiest/midday.js/vue';

const elementRef = ref(null);
useMidday(elementRef);
</script>

<template>
  <header ref="elementRef">
    <Nav />
  </header>
</template>
```

Or as a directive (import as `vMidday` for auto-registration in `<script setup>`):

```html
<script setup>
import { vMidday } from '@marcwiest/midday.js/vue';
</script>

<template>
  <header v-midday>
    <Nav />
  </header>
</template>
```

### Svelte

```html
<script>
  import { midday } from '@marcwiest/midday.js/svelte';
</script>

<header use:midday>
  <Nav />
</header>
```

### Solid

Primitive:

```jsx
import { createMidday } from '@marcwiest/midday.js/solid';

function Header() {
  let el;
  createMidday(() => el);

  return (
    <header ref={el} style={{ position: 'fixed', top: '0', left: '0', right: '0' }}>
      <Nav />
    </header>
  );
}
```

Or as a directive:

```jsx
import { midday } from '@marcwiest/midday.js/solid';

function Header() {
  return (
    <header use:midday style={{ position: 'fixed', top: '0', left: '0', right: '0' }}>
      <Nav />
    </header>
  );
}
```

### Passing options

All adapters accept `onChange`:

```jsx
// React
useMidday(elementRef, { onChange: (v) => console.log(v) });

// Vue (composable)
useMidday(elementRef, { onChange: (v) => console.log(v) });

// Vue (directive)
<header v-midday="{ onChange: (v) => console.log(v) }"></header>

// Svelte
<header use:midday={{ onChange: (v) => console.log(v) }}></header>

// Solid (primitive)
createMidday(() => el, { onChange: (v) => console.log(v) });

// Solid (directive)
<header use:midday={{ onChange: (v) => console.log(v) }}></header>
```

## Multiple Instances

midday.js supports multiple independent fixed elements on the same page (e.g., a top header and a bottom app-bar). Name each instance via the `data-midday-element` attribute and use `data-midday-target` on sections to control which instance they affect.

```html
<header data-midday-element="top">...</header>
<nav class="app-bar" data-midday-element="bottom">...</nav>

<!-- Targets only the top element -->
<section data-midday-section="accent" data-midday-target="top">...</section>

<!-- Targets both (space-separated) -->
<section data-midday-section="inverted" data-midday-target="top bottom">...</section>

<!-- No target — applies to ALL instances -->
<section data-midday-section="dark">...</section>
```

```js
import { midday } from '@marcwiest/midday.js';

const top = midday(document.querySelector('[data-midday-element="top"]'));
const bottom = midday(document.querySelector('[data-midday-element="bottom"]'));
```

Each instance runs its own engine and only reacts to its own sections. The instance name defaults to the element's `data-midday-element` attribute value, or you can set it explicitly via `options.name`.

## SSR & SEO

midday.js is designed to be SSR-safe by default.

**Auto mode** (including all framework adapters) clones element content client-side on mount. The server-rendered HTML always contains a single, clean element — no duplicate navigation links, no hidden clones. Search engine crawlers see exactly one set of content.

After hydration, the plugin creates variant clones in the browser. These clones are marked with `aria-hidden="true"` and `inert`, so they're invisible to screen readers and excluded from keyboard navigation. The original content remains the accessible version.

**Headless mode** is different — since you provide the variant elements yourself, they exist in your markup. If you're using headless mode with SSR, render non-default variants client-side only to avoid duplicate content in the server HTML:

```jsx
// React (headless + SSR)
import { useState, useEffect } from 'react';
import { middayHeadless } from '@marcwiest/midday.js';

function Header() {
  const [mounted, setMounted] = useState(false);
  const elementRef = useRef(null);
  const defaultRef = useRef(null);
  const darkRef = useRef(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !elementRef.current) return;
    const instance = middayHeadless({
      element: elementRef.current,
      variants: { default: defaultRef.current, dark: darkRef.current },
    });
    return () => instance.destroy();
  }, [mounted]);

  return (
    <header ref={elementRef}>
      <div ref={defaultRef} className="header-default"><Nav /></div>
      {mounted && (
        <div ref={darkRef} className="header-dark" aria-hidden="true" inert="">
          <Nav />
        </div>
      )}
    </header>
  );
}
```

For most use cases, the framework adapters (which use auto mode) are simpler and SSR-safe without any extra work.

## How It Works

midday.js uses `clip-path: inset()` to reveal and hide variant elements as sections scroll past.

1. **Auto mode** clones the element's content once per unique variant found in `data-midday-section` attributes. Each clone is wrapped in an absolutely-positioned container inside the managed element.

2. On each scroll frame, the plugin calculates which sections overlap the element's viewport position and by how many pixels.

3. Each variant's container gets a `clip-path: inset(topPx 0 bottomPx 0)` that reveals exactly the portion corresponding to its section's overlap with the element. Every variant — including the default — is clipped to only its own region. Nothing is used as a backdrop, so transparent backgrounds work fine.

The result is a pixel-perfect wipe transition at every section boundary.

## Styling Guide

- The managed element should be `position: fixed` or `position: sticky`
- In auto mode, variant wrappers get `data-midday-variant="<name>"` — target them with `[data-midday-variant="dark"]` or however you prefer
- Transparent variant backgrounds work — each variant is clipped independently, so page content shows through where intended
- In headless mode, you're responsible for positioning variant elements absolutely within the managed element and setting `aria-hidden`/`inert` on non-default variants
- In headless mode, variant elements can have different heights than the managed element. The clip-path will track section boundaries exactly, with extra height revealing only when the section extends past the element edge
- Auto mode uses `cloneNode(true)` to create variant copies. This duplicates DOM structure and attributes but **not** JavaScript event listeners attached via `addEventListener`. If your element contains interactive elements (nav links, dropdowns, etc.), use **event delegation** — attach a single listener to `document` and match with `closest()` — so events work in all variants

## Overflow Content (Dropdowns, Flyouts)

`clip-path: inset(...)` clips **all** descendants, including `position: fixed` elements like dropdown panels. In auto mode, `cloneNode(true)` also duplicates dropdown markup into every variant. There is no library-level fix for this, but the workaround is straightforward:

**Keep triggers inside the element; render panels outside the element's DOM entirely.**

Position the panel as a sibling of the element (or in a portal container) and align it visually with its trigger. Since triggers get cloned into each variant, use **event delegation** to handle clicks:

```js
document.addEventListener('click', (e) => {
  const trigger = e.target.closest('.dropdown-trigger');
  if (!trigger) return;
  const panel = document.querySelector('#dropdown-panel');
  const rect = trigger.getBoundingClientRect();
  panel.style.top = rect.bottom + 'px';
  panel.style.left = rect.left + 'px';
  panel.classList.toggle('open');
});
```

**CSS Anchor Positioning** offers a progressive enhancement: set `anchor-name` on the trigger and use `position-anchor` + `position: fixed` on the panel. This works across DOM subtrees without JavaScript positioning. Browser support is still limited (Chromium 125+).

**Framework portals** solve this idiomatically: React's `createPortal`, Vue's `<Teleport to="body">`, Solid's `<Portal>`, or a Svelte portal library. Render the dropdown panel into `document.body` so it sits outside the clipped element entirely.

## Browser Support

Requires `clip-path: inset()` (97%+ global support), `ResizeObserver` (97%+), and `requestAnimationFrame`. Works in all modern browsers. No IE support.

## Development

```bash
pnpm install          # Install dependencies
pnpm dev              # Vite dev server (serves demo/ with HMR)
pnpm build            # Full build: ESM + UMD + .d.ts
pnpm test             # Run tests once
pnpm test:watch       # Watch mode
```

Tests use [Vitest](https://vitest.dev/) + [happy-dom](https://github.com/nicedayfor/happy-dom). Global mocks for `ResizeObserver` and `requestAnimationFrame` are in `tests/setup.ts` — see the comments there for details on the mock strategy.

## License

MIT
