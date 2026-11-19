/**
 * Colour tokens as data. `globals.css` declares the same hex values; `tests/contrast.test.ts`
 * asserts both that they agree and that every pair below meets WCAG AA.
 */
export const COLORS = {
  ink: "#07080c",
  surface: "#10131b",
  surface2: "#171b26",
  bone: "#ede6d3",
  mist: "#a9b0c0",
  dim: "#8089a0",
  ember: "#ff8a4c",
  emberDeep: "#d9541e",
  moon: "#9db4ff",
  rot: "#e5484d",
  dying: "#e8b04a",
  alive: "#6fcf97",
  lantern: "#ffd37a",
  rule: "#2a2f3d",
  edge: "#5a6278",
  stoneDead: "#c9cedb",
  stoneDying: "#d9c27a",
  stoneText: "#0b0e16",
} as const;

export type ColorName = keyof typeof COLORS;

/** [foreground, background, minimum ratio, what it is used for] */
export const PAIRS: ReadonlyArray<readonly [ColorName, ColorName, number, string]> = [
  ["bone", "ink", 4.5, "primary text"],
  ["bone", "surface", 4.5, "primary text on cards"],
  ["bone", "surface2", 4.5, "primary text on raised rows"],
  ["mist", "ink", 4.5, "secondary text"],
  ["mist", "surface", 4.5, "secondary text on cards"],
  ["mist", "surface2", 4.5, "secondary text on raised rows"],
  ["dim", "ink", 4.5, "tertiary text"],
  ["dim", "surface", 4.5, "tertiary text on cards"],
  ["dim", "surface2", 4.5, "tertiary text on raised rows"],
  ["ember", "ink", 4.5, "ember text and links"],
  ["ember", "surface", 4.5, "ember text on cards"],
  ["ink", "ember", 4.5, "label on ember button"],
  ["moon", "ink", 4.5, "links"],
  ["moon", "surface", 4.5, "links on cards"],
  ["moon", "surface2", 4.5, "links on raised rows"],
  ["rot", "ink", 4.5, "DEAD label"],
  ["rot", "surface", 4.5, "DEAD label on cards"],
  ["dying", "ink", 4.5, "DYING label"],
  ["dying", "surface", 4.5, "DYING label on cards"],
  ["alive", "ink", 4.5, "ALIVE label"],
  ["alive", "surface", 4.5, "ALIVE label on cards"],
  ["alive", "surface2", 4.5, "ALIVE label on raised rows"],
  ["lantern", "ink", 3, "focus ring"],
  ["lantern", "surface", 3, "focus ring on cards"],
  ["edge", "ink", 3, "input and button border"],
  ["edge", "surface", 3, "input and button border on cards"],
  ["stoneText", "stoneDead", 4.5, "carved text on dead stone"],
  ["stoneText", "stoneDying", 4.5, "carved text on dying stone"],
  ["emberDeep", "ink", 3, "ember border"],
];
