---
inclusion: fileMatch
fileMatchPattern: "apps/web/**"
description: Visual language, motion and accessibility rules for the Revenant web app.
---

# Design system

- Mood: night graveyard, cold moonlight, one warm accent for resurrection. Original illustration in SVG and CSS. No WebGL.
- Palette tokens live in `apps/web/src/app/globals.css`: ink (background), bone (text), moon (cool accent), ember (resurrection accent), and status colours that are always paired with a text label and a shape.
- Type: a high-contrast display serif for headings, a clean sans for UI, a mono for evidence fields.
- Motion: slow fog drift, soft parallax on the hero, staggered tombstone rise. Everything is disabled under `prefers-reduced-motion`.
- Accessibility: keyboard operable, visible focus ring, dialogs use the native `dialog` element, status never relies on colour alone, works to 360 px.
- Performance: Lighthouse performance 90+ on the landing page; no images above the fold that are not inline SVG.
- References studied are listed in `DESIGN.md`.
