# midday.js

A modern, zero-dependency vanilla JS plugin for fixed headers that change style as you scroll through page sections. The spiritual successor to [midnight.js](https://github.com/Aerolab/midnight.js).

**~1 kB gzipped** (auto mode) | TypeScript | Framework adapters (React, Vue, Svelte, Solid) included

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
npm install midday.js
```

Or via CDN (UMD):

```html
<script src="https://unpkg.com/midday.js/dist/midday.umd.js"></script>
```

## Quick Start

### 1. Write one header, mark your sections

You write a single header. Each section declares which header style it wants via `data-midday-section`:

```html
<header data-midday>
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
import { midday } from 'midday.js';

const instance = midday(document.querySelector('[data-midday]'));
```

### 3. What happens next

The plugin reads every unique `data-midday-section` value on the page (`"dark"`, `"accent"`) and clones your header once per variant. Each clone is wrapped in a container with a `data-midday-variant` attribute. Your original HTML stays as-is — the clones are created at runtime:

```
<header data-midday>                               ← your element (position: fixed)
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

That's it. Scroll through your sections and the header transitions smoothly from one section to another.

## API

### `midday(header, options?)` — Auto mode

Clones your header content once per variant and manages everything. Sections are discovered automatically via `data-midday-section` attributes.

```js
const instance = midday(document.querySelector('[data-midday]'));

// With optional onChange callback:
const instance = midday(document.querySelector('[data-midday]'), {
  onChange: (variants) => console.log(variants),
});
```

### `middayHeadless(options)` — Headless mode

You provide pre-rendered variant elements. The plugin only manages `clip-path` values. No DOM cloning. Use this when you need **different markup** (not just different styles) per variant.

```js
import { middayHeadless } from 'midday.js';

const instance = middayHeadless({
  header: document.querySelector('header'),
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
instance.refresh();  // Re-scan sections and recalculate (call after DOM changes)
instance.destroy();  // Full teardown — removes clones, listeners, observers
```

### `onChange` callback

Fires whenever the set of visible variants changes:

```js
midday(header, {
  onChange: (variants) => {
    // variants: Array<{ name: string, progress: number }>
    // progress: 0–1, how much of the header this variant covers
    console.log(variants);
    // e.g. [{ name: 'dark', progress: 0.7 }, { name: 'default', progress: 0.3 }]
  },
});
```

## Framework Adapters

Each adapter is a separate tree-shakable entry point (~0.2 kB gzipped). Import only the one you need — the others are never bundled.

The adapters wrap **auto mode** — your component renders a single header element, and cloning happens client-side on mount. This means your server-rendered HTML always contains just one header, keeping SEO clean (see [SSR & SEO](#ssr--seo) below).

### React

```jsx
import { useRef } from 'react';
import { useMidday } from 'midday.js/react';

function Header() {
  const headerRef = useRef(null);
  useMidday(headerRef);

  return (
    <header ref={headerRef} style={{ position: 'fixed', top: 0, left: 0, right: 0 }}>
      <Nav />
    </header>
  );
}
```

### Vue

```vue
<script setup>
import { ref } from 'vue';
import { useMidday } from 'midday.js/vue';

const headerRef = ref(null);
useMidday(headerRef);
</script>

<template>
  <header ref="headerRef">
    <Nav />
  </header>
</template>
```

### Svelte

```svelte
<script>
  import { midday } from 'midday.js/svelte';
</script>

<header use:midday>
  <Nav />
</header>
```

### Solid

```jsx
import { createMidday } from 'midday.js/solid';

function Header() {
  let headerEl;
  createMidday(() => headerEl);

  return (
    <header ref={headerEl} style={{ position: 'fixed', top: '0', left: '0', right: '0' }}>
      <Nav />
    </header>
  );
}
```

### Passing options

All adapters accept `onChange` as an optional second argument:

```js
// React
useMidday(headerRef, { onChange: (v) => console.log(v) });

// Svelte
<header use:midday={{ onChange: (v) => console.log(v) }}>
```

## SSR & SEO

midday.js is designed to be SSR-safe by default.

**Auto mode** (including all framework adapters) clones header content client-side on mount. The server-rendered HTML always contains a single, clean header element — no duplicate navigation links, no hidden clones. Search engine crawlers see exactly one header with one set of nav links.

After hydration, the plugin creates variant clones in the browser. These clones are marked with `aria-hidden="true"` and `inert`, so they're invisible to screen readers and excluded from keyboard navigation. The original header content remains the accessible version.

**Headless mode** is different — since you provide the variant elements yourself, they exist in your markup. If you're using headless mode with SSR, render non-default variants client-side only to avoid duplicate content in the server HTML:

```jsx
// React (headless + SSR)
import { useState, useEffect } from 'react';
import { middayHeadless } from 'midday.js';

function Header() {
  const [mounted, setMounted] = useState(false);
  const headerRef = useRef(null);
  const defaultRef = useRef(null);
  const darkRef = useRef(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !headerRef.current) return;
    const instance = middayHeadless({
      header: headerRef.current,
      variants: { default: defaultRef.current, dark: darkRef.current },
    });
    return () => instance.destroy();
  }, [mounted]);

  return (
    <header ref={headerRef}>
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

midday.js uses `clip-path: inset()` to reveal and hide variant header elements as sections scroll past.

1. **Auto mode** clones the header content once per unique variant found in `data-midday-section` attributes. Each clone is wrapped in an absolutely-positioned container inside the header element.

2. On each scroll frame, the plugin calculates which sections overlap the header's viewport position and by how many pixels.

3. Each variant's container gets a `clip-path: inset(topPx 0 bottomPx 0)` that reveals exactly the portion corresponding to its section's overlap with the header. Every variant — including the default — is clipped to only its own region. Nothing is used as a backdrop, so transparent backgrounds work fine.

The result is a pixel-perfect wipe transition at every section boundary.

## Styling Guide

- The header element should be `position: fixed` or `position: sticky`
- In auto mode, variant wrappers get `data-midday-variant="<name>"` — target them with `[data-midday-variant="dark"]` or however you prefer
- Transparent variant backgrounds work — each variant is clipped independently, so page content shows through where intended
- In headless mode, you're responsible for positioning variant elements absolutely within the header and setting `aria-hidden`/`inert` on non-default variants

## Browser Support

Requires `clip-path: inset()` (97%+ global support), `ResizeObserver` (97%+), and `requestAnimationFrame`. Works in all modern browsers. No IE support.

## License

MIT
