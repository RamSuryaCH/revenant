---
inclusion: fileMatch
fileMatchPattern: "apps/web/**"
description: Visual language, tokens, motion and accessibility rules for the Revenant web app ("The Ledger of the Dead").
---

# Design system: The Ledger of the Dead

A dark editorial necropolis. Each tombstone is also a row in a ledger: carved stone on top, evidence in mono below, and one ember light that appears only when something is brought back. Original SVG and CSS art only. WebGL is not used.

## Colour tokens (in `apps/web/src/app/globals.css`, pairs asserted by `tests/contrast.test.ts`)

| Token | Hex | Role |
|---|---|---|
| ink | `#07080C` | page background |
| surface / surface-2 | `#10131B` / `#171B26` | cards, drawer, raised rows |
| bone | `#EDE6D3` | primary text |
| mist | `#A9B0C0` | secondary text |
| dim | `#8089A0` | tertiary text, never dimmer |
| ember / ember-deep | `#FF8A4C` / `#D9541E` | resurrection only; the only warm colour |
| moon | `#9DB4FF` | links and scan line |
| rot / dying / alive | `#E5484D` / `#E8B04A` / `#6FCF97` | status text, always with glyph and word |
| lantern | `#FFD37A` | focus ring |
| rule | `#2A2F3D` | decorative hairlines only |
| edge | `#5A6278` | input and button borders (3:1) |
| stone text | `#0B0E16` on `#C9CEDB` (dead), on `#D9C27A` (dying) | carved text |

Status is never colour alone: dead = cross + DEAD, dying = half circle + DYING, alive = open circle + ALIVE.

## Type (OFL, via `next/font`)

Fraunces for display and epitaph pull quotes, Inter for UI, JetBrains Mono for evidence. Floor 12 px. Tracking above 0.1em only on one-word labels. Fluid scale: display `clamp(36px, 6vw, 72px)`, title `clamp(24px, 3vw, 36px)`, evidence 13 px, label 12 px.

## Spacing and layout

4 px base. Max content 1280. Side margins 20 / 28 / 40. Touch targets 44 px. Dead and dying are large stone cards; alive is a collapsed ledger. Nothing may overflow sideways at 360 px (`overflow-wrap: anywhere` on repo and package names).

## Motion

- One light, one gesture. Ember is the only thing that turns on.
- Animate only `transform`, `opacity`, `clip-path`, `stroke-dashoffset`. No springs on stone.
- Tokens: micro 120 ms, ui 240 ms, panel 480 ms, scene 900 ms, moment 1600 ms; stagger 60-90 ms capped at 600 ms.
- The Resurrect sequence is one Web Animations API timeline built from real response data; if the response is late, hold the ember beat; never fake completion.
- `prefers-reduced-motion` or the in-page toggle: no translation, parallax, drift or particles; Resurrect becomes a captioned step-through with the same data.
- Ambient motion pauses when the tab is hidden.
- Click targets never move: no `transform` on a card button on hover or focus (hover is a border, shadow and the cursor candle). Entrance rise lives on the list item and is 12 px over 480 ms. No global `scroll-behavior: smooth`.
- The Resurrect stage on wide screens keeps the stone in the left half and the three artifact cards, then the PR card, in the right half. Narrow screens swap the cards for the PR card.
- Cursor candle (ember radial following the pointer) on hero and graveyard stones; off under either reduced-motion switch.

## Stones (round 5)

Dead and dying packages are inline SVG tombstones (one shared defs sheet, per-stone `viewBox 0 0 300 380`, `preserveAspectRatio=none`): gradient body, grain, bright top-left lit edge, dark bottom-right edge, carved inset arch, crack for dying, ember rim on hover/focus. The arch is an ellipse 50% by 39.5% so CSS `border-radius: 50% 50% 0 0 / 39.5% 39.5% 0 0` clips the cursor candle to the same shape. Text stays HTML. Grain and edge shading darken at most 12%; `tests/stones.test.ts` asserts AA on the darkened stops. Below the hero a three-beat narrative (Scan, Epitaph, Resurrect) shows one real artifact each. Under 768 px the filter bar sticks to the bottom and the drawer is a draggable bottom sheet. Share image is generated from the same hero data. All art is original SVG; no raster art.

## Accessibility

Keyboard operable end to end, visible 2 px lantern focus ring, native `dialog` with focus return, status never by colour alone, `aria-live="polite"` for scan and resurrect progress, works to 360 px and 200% zoom.

## Performance

Lighthouse mobile: performance 90+, accessibility 95+, LCP under 2.5 s. The `h1` is the LCP element. No raster image above the fold. The Resurrect chunk loads on first hover or press.

References studied are listed in `DESIGN.md`.
