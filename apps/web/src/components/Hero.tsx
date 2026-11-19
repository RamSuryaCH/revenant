"use client";

import { useRef, useState } from "react";
import type { Tombstone } from "@revenant/engine";
import { HERO_COUNTS, HERO_STONES } from "@/data/hero-sample";
import { HeroStone } from "./Stone";

interface HeroProps {
  url: string;
  setUrl: (v: string) => void;
  busy: boolean;
  onScan: (target: string) => void;
  onSandbox: () => void;
  onExample: () => void;
  onSample: () => void;
  info: string | null;
  error: string | null;
  onOpen: (t: Tombstone, el: HTMLElement) => void;
  reduce: boolean;
  toggleReduce: () => void;
}

export function Hero({ url, setUrl, busy, onScan, onSandbox, onExample, onSample, info, error, onOpen, reduce, toggleReduce }: HeroProps) {
  const input = useRef<HTMLInputElement>(null);
  const [nudge, setNudge] = useState(false);
  const sentence = `${HERO_COUNTS.badDirect} of ${HERO_COUNTS.direct} direct dependencies in the cursed sample app are dead or dying (3 shown).`;

  return (
    <header className="relative isolate flex min-h-[calc(100svh-100px)] flex-col overflow-hidden">
      <div className="ambient" aria-hidden="true">
        <div className="plot-grid" />
        <div className="fog" style={{ bottom: "-6%" }} />
        <div className="fog fog-b" style={{ bottom: "8%" }} />
        <div className="grain" />
      </div>

      <nav className="relative z-10 mx-auto flex w-full max-w-[1280px] items-center justify-between px-[var(--pad)] py-5" aria-label="Primary">
        <span className="t-title" style={{ fontSize: 24 }}>Revenant</span>
        <span className="flex items-center gap-3">
          <button type="button" className="btn-ghost" aria-pressed={reduce} onClick={toggleReduce}>Reduce motion</button>
          <a href="https://github.com/RamSuryaCH/revenant" className="inline-flex min-h-11 items-center text-[15px] text-mist underline-offset-4 hover:text-bone hover:underline" target="_blank" rel="noreferrer">GitHub</a>
        </span>
      </nav>

      <div className="relative z-10 mx-auto grid w-full max-w-[1280px] grid-cols-[minmax(0,1fr)] gap-4 sm:gap-10 px-[var(--pad)] pb-8 pt-4 lg:grid-cols-12 lg:items-center lg:gap-8 lg:pb-12 lg:pt-8">
        <div className="min-w-0 lg:col-span-7">
          <p className="t-label lift text-moon" style={{ ["--i" as string]: 0 }}>Kiroween 2026 / Resurrection</p>
          <h1 className="t-display lift mt-4 max-w-[14ch] sm:max-w-none" style={{ ["--i" as string]: 1 }}>Your dependencies have a graveyard.</h1>
          <p className="lift mt-4 max-w-[52ch] text-base sm:mt-5 sm:text-[17px] leading-relaxed text-mist" style={{ ["--i" as string]: 3 }}>
            Paste a repo. Every dead package gets an epitaph that cites its source. One click raises a Kiro spec, a patch, property tests and a real pull request.
          </p>

          <form
            className="lift mt-5 max-w-[560px] sm:mt-8"
            style={{ ["--i" as string]: 5 }}
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (busy) return;
              if (!url.trim()) {
                setNudge(true);
                input.current?.focus();
                return;
              }
              setNudge(false);
              onScan(url.trim());
            }}
          >
            <label htmlFor="repo-url" className="sr-only">GitHub repository URL</label>
            <div className="scanbox">
              <input
                ref={input}
                id="repo-url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (nudge) setNudge(false);
                }}
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="owner/repo or github.com/owner/repo"
                aria-describedby="scan-hint"
              />
              <button type="submit" className="btn-ember" aria-disabled={busy}>{busy ? "Scanning" : "Scan"}</button>
            </div>
            <p id="scan-hint" className="mt-2 text-sm" style={{ color: nudge ? "var(--color-ember)" : "var(--color-dim)" }}>
              {busy ? "A scan is running. It finishes in a few seconds." : nudge ? "Paste a repository first (owner/repo works), or try the sandbox repo below." : "Reads the root package.json of a public npm repository."}
            </p>
          </form>

          <p className="lift mt-1 flex flex-wrap items-center gap-x-4 sm:mt-3 sm:gap-x-5" style={{ ["--i" as string]: 6 }}>
            <span className="hidden text-[15px] text-mist sm:inline">No repo handy?</span>
            <button type="button" className="link-moon" disabled={busy} onClick={onSandbox}>Haunt the sandbox repo</button>
            <button type="button" className="link-moon" disabled={busy} onClick={onExample}>or scan bower/bower</button>
            <button type="button" className="link-moon" disabled={busy} onClick={onSample}>or the sample</button>
          </p>

          {info && <p role="status" className="mt-4 max-w-[560px] rounded-xl border border-moon/40 bg-moon/10 px-4 py-3 text-[15px] leading-relaxed">{info}</p>}
          {error && <p role="alert" className="mt-4 max-w-[560px] rounded-xl border border-ember-deep bg-ember/10 px-4 py-3 text-[15px]">{error}</p>}
        </div>

        <div className="min-w-0 lg:col-span-5">
          <p className="t-label mb-2 text-dim">Three of the dead, with their sources</p>
          <ul className="snap" aria-label="Example tombstones from the cached sample">
            {HERO_STONES.map((t, i) => (
              <HeroStone key={t.name} t={t} index={i} onOpen={onOpen} />
            ))}
          </ul>
        </div>
      </div>

      <div className="relative z-10 mx-auto mt-auto w-full max-w-[1280px] border-t border-rule px-[var(--pad)] py-4">
        <p className="sr-only">{sentence}</p>
        <p aria-hidden="true" className="t-evidence text-mist">
          <span className="count tick text-ember" style={{ ["--n" as string]: HERO_COUNTS.badDirect }} /> of {HERO_COUNTS.direct} direct dependencies in the cursed sample app are dead or dying (3 shown).
        </p>
      </div>
    </header>
  );
}
