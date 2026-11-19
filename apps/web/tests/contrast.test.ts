import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrast } from "../src/lib/contrast";
import { COLORS, PAIRS } from "../src/lib/tokens";

describe("colour tokens", () => {
  it.each(PAIRS)("%s on %s is at least %s:1 (%s)", (fg, bg, min) => {
    expect(contrast(COLORS[fg], COLORS[bg])).toBeGreaterThanOrEqual(min);
  });

  it("matches the hex values declared in globals.css", () => {
    const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8").toLowerCase();
    for (const [name, hex] of Object.entries(COLORS)) {
      expect(css, `${name} ${hex}`).toContain(hex);
    }
  });

  it("uses no font size below 12px in the stylesheet or components", () => {
    const files = ["../src/app/globals.css", "../src/components/App.tsx", "../src/components/Hero.tsx", "../src/components/Stone.tsx", "../src/components/Graveyard.tsx", "../src/components/Drawer.tsx", "../src/components/ResurrectSequence.tsx", "../src/components/PrCard.tsx"];
    for (const f of files) {
      const src = readFileSync(new URL(f, import.meta.url), "utf8");
      for (const m of src.matchAll(/text-\[(\d+(?:\.\d+)?)px\]|font-size:\s*(\d+(?:\.\d+)?)px/g)) {
        expect(Number(m[1] ?? m[2]), `${f}: ${m[0]}`).toBeGreaterThanOrEqual(12);
      }
    }
  });
});
