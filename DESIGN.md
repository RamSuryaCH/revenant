# Design notes

## Direction

Night graveyard, cold moonlight, one warm ember accent that means "resurrect". Everything is original SVG and CSS (no WebGL, no stock art): a moon, three parallax hill layers, two drifting fog bands, tombstones drawn as inline SVG, living packages as glowing lanterns.

## References

Browsed on awwwards.com for motion pacing, type scale and restraint (listing pages only, not source-level analysis):

- [Dark Star Labs](https://www.awwwards.com/sites/dark-star-labs): cinematic, narrative-led hero; one dominant light source.
- [Turion Space](https://www.awwwards.com/sites/turion-space): precise, slow motion over dark fields.
- [Izanami](https://www.awwwards.com/sites/izanami): large serif display type with generous negative space.
- [Station Agro-Biotech](https://www.awwwards.com/sites/station-agro-biotech): motion-rich identity, staggered reveals.

What we took: a single glowing focal point (the moon, then the ember button), a high-contrast display serif (Fraunces) against a quiet sans (Inter) and a mono (JetBrains Mono) for evidence, staggered entrance of elements, and slow ambient motion. What we did not take: heavy WebGL or scroll-jacking, to keep the landing fast on a judge's laptop.

## Motion

Fog drifts (70 s and 110 s loops), pointer parallax on three layers, tombstones rise with a 55 ms stagger, lanterns flicker. All motion is removed under `prefers-reduced-motion`.

## Accessibility

Tombstones are real buttons with full aria-labels. The detail view is a native `dialog`. Status is always written ("Dead", "Dying", "Alive"), never colour alone. Focus ring is visible. Layout verified at 360 px with no horizontal scroll.

## Tokens

See `@theme` in `apps/web/src/app/globals.css`: ink, bone, moon, ember, stone, moss, lantern.
