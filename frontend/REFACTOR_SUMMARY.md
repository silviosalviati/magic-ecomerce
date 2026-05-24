# Frontend Refactor Summary — Vista Magic

## 1. CSS Architecture — Token Consolidation

**Deleted legacy aliases** (`--bg`, `--surface`, `--surface-soft`, `--card`, `--border`, `--text`, `--muted`, `--accent`) and all their usages in cart/detail/breadcrumb rules replaced with canonical `--color-*` equivalents.

**Made brand tokens primary direct values** (were chained aliases):
- `--color-bg-base: #0D0D0D`
- `--color-bg-deep: #322F30`
- `--color-bg-card: #3A3637`
- `--color-accent: #E8B4B0`

**Removed intermediate internal aliases** no longer needed: `--color-brand-primary`, `--color-brand-secondary`, `--color-surface`, old `--color-surface-raised` (#322F30), `--color-surface-high`, `--color-surface-overlay`, `--dm-*` dark-mode pre-wires (unused).

**Added missing tokens:**
- `--color-surface-raised: #453f41` — elevated surface (e.g. drawers, raised panels)
- `--color-accent-muted: rgba(232, 180, 176, 0.15)` — used in feature bar hover
- `--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1)` — single source for consistent UI transitions

**Border radius updated** to spec: `--radius-md: 6px` (was 4px), `--radius-lg: 12px` (was 8px).

**Button token updated:** `--btn-tracking: 0.1em` (was `var(--tracking-wide)` = 0.06em).

## 2. Typography

**Cormorant Garamond weights extended** in `index.html` — added `0,600;1,600` to the Google Fonts URL (spec requires 400 + 600 italic; previously only 300/400 italic were loaded).

**Type scale updated** to spec:

| Token | New | Old |
|---|---|---|
| `--text-xs` | 10px | 9px |
| `--text-sm` | 12px | 11px |
| `--text-base` | 14px | 13px |
| `--text-lg` | 16px | 17px |
| `--text-2xl` | 28px | 24px |
| `--text-3xl` | 40px | 28px |

Removed `--text-md` and `--text-4xl` (not in spec; no CSS properties referenced them by name).

**`--font-display` applied** to elements previously using `--font-body`:
- `.hero-headline` — editorial centrepiece
- `.product-name` — Cormorant Garamond italic for product names in the grid
- `.category-title` — section headings

**`--font-body`** (Georgia) now correctly scoped to `.product-description` feature text only.

## 3. Product Grid — Fashion Editorial Layout

- **≥768px:** 2-col grid (was 3-col — previous 3-col at 768px was too compressed for luxury imagery)
- **≥1024px:** 2-col maintained
- **≥1100px:** Asymmetric `1.2fr 1fr 1fr` — the lead column is wider, creating editorial hierarchy
- **`.product-media`:** Switched from `aspect-ratio: 3/4` to `height: clamp(280px, 40vw, 480px)`. Fixed-height gives consistent grid rhythm regardless of column width.
- **Image hover:** `.product-media:hover img { transform: scale(1.02) }` with `overflow: hidden` on container and `transition: transform var(--transition-base)` on the image.
- **`.product-content` padding:** `var(--space-5) var(--space-4)` = 20px 16px (was 14px 16px 16px).

## 4. Header — Sticky Luxury Bar

- **Desktop padding:** `20px 40px` at ≥1024px (was 16px 32px)
- **Nav letter-spacing:** `var(--tracking-wider)` = 0.12em (was 0.08em)
- **Logo height:** `clamp(48px, 6vw, 72px)` (was clamp(46px, 6vw, 68px))
- **Scroll-driven border opacity:** Added via `@supports (animation-timeline: scroll())`. When supported, `border-bottom` is replaced by an `::after` pseudo-element that animates opacity 0→1 over the first 80px of scroll using `animation-timeline: scroll(root)`. Browsers without support (Firefox pre-2024) fall back to the static `border-bottom: 0.5px solid var(--color-border)`.

## 5. Buttons — 3 Canonical Variants, No Duplicates

Removed 4 duplicate/override blocks that caused cascade conflicts:
- Second `.primary-btn` block (hardcoded px overrides duplicating block above)
- `.btn-primary, .btn-ghost` font-size override (now handled by base)
- Hero-section `.btn-primary` block (had `display: inline-block`, breaking flex icon layout)
- Hero-section `.btn-ghost` block (redundant)

| Variant | Background | Border | Color | Rationale |
|---|---|---|---|---|
| `.btn-primary` / `.primary-btn` | `--color-accent` | none | `#0D0D0D` | High-contrast on blush rose |
| `.btn-secondary` | transparent | `0.5px solid --color-accent` | `--color-accent` | Was incorrectly using `--color-border` + `--color-text-primary` |
| `.btn-ghost` / `.ghost-btn` | transparent | none | `--color-text-muted` | Unchanged, correct |

All variants share base: `border-radius var(--btn-radius)` (2px), `font-size var(--text-xs)` (10px), `text-transform uppercase`, `transition var(--transition-base)`.

## 6. Feature Bar

- `.feat` has `border-left: 1px solid transparent` by default — prevents layout shift on hover
- `.feat:hover { border-left-color: var(--color-accent-muted) }` — subtle rose left accent on hover
- Transition: `border-left-color var(--transition-base)`

## 7. Motion — Card Stagger System

**Added `@keyframes fadeUp`:**
```css
from { opacity: 0; transform: translateY(16px) }
to   { opacity: 1; transform: none }
```

**Applied to `.product-card`:**
```css
animation: fadeUp 0.5s var(--ease-spring) both;
animation-delay: calc(var(--i, 0) * 80ms);
```

**`--i` set via inline style in `HomePage.tsx`** — all three grids (novidades, feminino, masculino):
```tsx
style={{ '--i': index } as React.CSSProperties}
```

**`ProductCard.tsx`** updated: accepts optional `style?: React.CSSProperties` and forwards it to `<article>`. The `React` import is a type-only import, adds no runtime cost.

Existing `pageReveal` section animations preserved unchanged (hero, features, catalog, category sections, footer).

## Files Changed

| File | Change |
|---|---|
| `frontend/src/index.css` | Full token restructure, typography, grid breakpoints, button consolidation, feature hover, fadeUp animation |
| `frontend/index.html` | Added `0,600;1,600` Cormorant Garamond weights to Google Fonts URL |
| `frontend/src/components/ProductCard.tsx` | Added `style?: React.CSSProperties` prop forwarded to `<article>` |
| `frontend/src/pages/HomePage.tsx` | `style={{ '--i': index }}` on all three `ProductCard` map() calls |
