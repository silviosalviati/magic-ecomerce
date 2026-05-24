# Vista Magic — Brand Tokens

> Source of truth for all design decisions. Do not use values outside this document.

---

## Brand Identity

| Property | Value |
|---|---|
| Brand name | **Vista Magic** / **MAGI.C** |
| Tagline | *Seu estilo, sua magia* |
| Language | Brazilian Portuguese (pt-BR) |
| Tone | Luxury editorial dark — formal but warm, curated, never generic |
| Mode | Dark-first (no light mode planned) |

---

## Color System

### Brand Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-brand-primary` | `#E8B4B0` | CTAs, active states, accents — warm mauve |
| `--color-brand-secondary` | `#f3d7d4` | Highlights, hover tints, secondary accents |
| `--color-danger` | `#ef8ba0` | Error states, destructive actions |
| `--color-success` | `#7fcf9a` | In-stock badge, confirmation states |

### Surface Scale (dark-first)

| Token | Hex | Usage |
|---|---|---|
| `--color-surface` | `#0D0D0D` | Page canvas — primary background |
| `--color-surface-raised` | `#322F30` | Hero bg, sidebar, cards second level |
| `--color-surface-high` | `#3A3637` | Cards, modals, primary card surface |
| `--color-surface-overlay` | `#453f41` | Hover overlays, deepest elevation |

### Text Scale

| Token | Value | Usage |
|---|---|---|
| `--color-text-primary` | `#F5EDE8` | Body copy, headings — warm off-white |
| `--color-text-muted` | `rgba(245,237,232, 0.50)` | Secondary text, labels, descriptions |
| `--color-text-faint` | `rgba(245,237,232, 0.28)` | Placeholders, captions, metadata |

### Border & Overlay

| Token | Value | Usage |
|---|---|---|
| `--color-border` | `rgba(232,180,176, 0.12)` | Default borders — accent-tinted |
| `--color-border-strong` | `rgba(232,180,176, 0.28)` | Focused/hovered borders |

### Channel Variables (for rgba composition)

| Token | Value |
|---|---|
| `--color-accent-ch` | `232, 180, 176` |
| `--color-text-ch` | `245, 237, 232` |

---

## Typography

### Font Families

| Token | Value | Usage |
|---|---|---|
| `--font-display` | `'Cormorant Garamond', Georgia, serif` | Checkout titles, confirmation text, order summary |
| `--font-body` | `Georgia, serif` | Product names, hero headlines, category titles, editorial headings |
| `--font-ui` | `'Manrope', sans-serif` | Nav, labels, buttons, badges, body copy, micro-copy |
| `--font-mono` | `'Courier New', 'Lucida Console', monospace` | Card numbers, barcodes, codes |

### Type Scale

| Token | px | Usage |
|---|---|---|
| `--text-xs` | `9px` | Labels, meta tags, eyebrows, uppercase tracking |
| `--text-sm` | `11px` | Buttons, badges, captions, feature descriptions |
| `--text-base` | `13px` | Body copy, product names, nav links, cart items |
| `--text-md` | `15px` | Form inputs, slightly larger body |
| `--text-lg` | `17px` | Recommendation headings, card prices |
| `--text-xl` | `20px` | Cart total, hero sub-labels |
| `--text-2xl` | `24px` | — |
| `--text-3xl` | `28px` | Checkout section titles |
| `--text-4xl` | `clamp(26px, 4vw, 48px)` | Hero headline, product detail title |

### Line Heights

| Token | Value |
|---|---|
| `--leading-tight` | `1.1` |
| `--leading-snug` | `1.25` |
| `--leading-normal` | `1.5` |
| `--leading-relaxed` | `1.65` |

### Letter Spacing

| Token | Value | Usage |
|---|---|---|
| `--tracking-tight` | `-0.01em` | Large display headlines |
| `--tracking-normal` | `0em` | Body copy |
| `--tracking-wide` | `0.06em` | Nav links, subheadings |
| `--tracking-wider` | `0.12em` | Labels, checkout fields |
| `--tracking-widest` | `0.22em` | Uppercase eyebrows, card field labels |

---

## Spacing Scale (4px base unit)

| Token | px | Common use |
|---|---|---|
| `--space-1` | `4px` | Micro gaps |
| `--space-2` | `8px` | Icon + label gap, tight component padding |
| `--space-3` | `12px` | Cart item gap, internal card padding |
| `--space-4` | `16px` | Section inner padding, form gap |
| `--space-5` | `20px` | Card padding, hero padding |
| `--space-6` | `24px` | Section padding, button padding-x |
| `--space-7` | `28px` | Checkout section padding |
| `--space-8` | `32px` | Header padding, section horizontal padding |
| `--space-9` | `36px` | — |
| `--space-10` | `40px` | Hero padding |
| `--space-12` | `48px` | Hero right padding |
| `--space-16` | `64px` | — |

---

## Border Radius

| Token | px | Usage |
|---|---|---|
| `--radius-none` | `0px` | Product grid cells, full-bleed images |
| `--radius-sm` | `2px` | **Brand signature** — buttons, badges, inputs, cards |
| `--radius-md` | `4px` | Image thumbnails, product cards |
| `--radius-lg` | `8px` | Boleto instructions box |
| `--radius-xl` | `12px` | Cart items, PIX QR wrapper, checkout sections |
| `--radius-2xl` | `16px` | Cart items (mobile), card preview |
| `--radius-full` | `999px` | Circular badges, qty controls |

---

## Shadows

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 6px rgba(0,0,0,0.35)` | Subtle card lift |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.45)` | Modals, drawers |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,0.55)` | Credit card preview |
| `--shadow-xl` | `0 16px 48px rgba(0,0,0,0.65)` | Drop shadow on card preview |
| `--shadow-card` | `0 2px 20px rgba(0,0,0,0.4)` | Checkout section shadow |

---

## Motion

### Easing Curves

| Token | Value | Use |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.4, 0, 0.2, 1)` | Default for most transitions |
| `--ease-decelerate` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering the screen |
| `--ease-accelerate` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving the screen |
| `--ease-spring` | `cubic-bezier(0.22, 1, 0.36, 1)` | Page reveals, section entrances |

### Durations

| Token | ms | Use |
|---|---|---|
| `--duration-instant` | `80ms` | State toggles (active/inactive) |
| `--duration-fast` | `150ms` | Hover states |
| `--duration-normal` | `220ms` | Color, border, background transitions |
| `--duration-slow` | `350ms` | Layout shifts, sidebar, card flip |

### Motion Patterns

- **Page load**: `sectionReveal` keyframe — `opacity: 0 → 1`, `translateY(16px → 0)`, `0.45s var(--ease-spring)`, staggered `animation-delay` per section
- **Checkout section**: same `sectionReveal` at `0.38s var(--ease-spring)`
- **Card shimmer**: slow indefinite `cardShimmer` at `4s ease-in-out`
- **Payment tab indicator**: `scaleX(0 → 1)` at `0.25s var(--ease-spring)`
- **Card CVV flip**: `rotateY` at `0.5s ease` (CSS 3D perspective)

---

## Button System

### Three canonical variants

| Class | Background | Color | Border | Use case |
|---|---|---|---|---|
| `.btn-primary` | `--color-brand-primary` | `--color-surface` | none | Primary CTAs — buy, checkout, confirm |
| `.btn-secondary` | transparent | `--color-text-primary` | `0.5px solid --color-border` | Secondary actions — view, retry, back |
| `.btn-ghost` | transparent | `--color-text-muted` | none | Utility — remove, cancel, nav |

### Button size tokens

| Token | Value |
|---|---|
| `--btn-height-sm` | `32px` |
| `--btn-height-md` | `40px` |
| `--btn-height-lg` | `48px` |
| `--btn-radius` | `var(--radius-sm)` (2px) |
| `--btn-font` | `var(--font-ui)` |
| `--btn-font-size` | `var(--text-sm)` (11px) |
| `--btn-tracking` | `var(--tracking-wide)` (0.06em) |
| `--btn-weight` | `600` |

---

## Grid & Layout

| Token | Value |
|---|---|
| Page max-width | `1320px` |
| Checkout max-width | `1100px` |
| Header z-index | `var(--z-sticky)` = `12` |
| Drawer z-index | `var(--z-drawer)` = `20` |
| Product card aspect-ratio | `3 / 4` |
| Credit card aspect-ratio | `1.586` (standard) |

### Breakpoints (mobile-first)

| Name | Min-width | Description |
|---|---|---|
| sm | `640px` | Tablet small — 2-col product grid |
| md | `768px` | Tablet — hero splits, 3-col, checkout 2-col |
| lg | `1024px` | Desktop — full spacing, max layout |

---

## Component Patterns

### Cards
- Border: `0.5px solid var(--color-border)`
- Radius: `var(--radius-sm)` (2px) — sharp brand signature
- Background: `var(--color-surface-high)`
- Hover: border-color upgrades to `var(--color-border-strong)` — ONE hover signal only

### Badges
- Radius: `var(--radius-sm)` (2px) or `var(--radius-full)` (qty circles)
- Font: `var(--font-ui)`, uppercase, `var(--text-xs)`, weight 700
- Tracking: `var(--tracking-wider)` (0.12em)

### Forms
- Input height: `40px` (matching `--btn-height-md`)
- Focus signal: `border-color: var(--color-brand-primary)` + shadow `0 1px 0 var(--color-brand-primary)`
- Label style: `var(--text-xs)`, uppercase, `var(--tracking-wider)`, `var(--color-text-faint)`

### Icons
- Stroke width: `1.5–1.9`
- Fill: none (line style)
- Color: `currentColor`
- Size: `14–18px`
