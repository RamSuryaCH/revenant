"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ScanResult, Tombstone } from "@revenant/engine";
import type { ScanEvent } from "@/app/api/scan/route";
import { Drawer } from "./Drawer";
import { Graveyard } from "./Graveyard";
import { Hero } from "./Hero";

type Phase = "idle" | "loading" | "streaming" | "ready";

const SAMPLE_REPO = "https://github.com/expressjs/express";
const CRYPT_REPO = "https://github.com/RamSuryaCH/revenant-crypt";

/** OS preference plus the in-page toggle; mirrored on <html data-reduce> so CSS can honour it. */
function useReduceMotion(): [boolean, () => void] {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  useEffect(() => {
    document.documentElement.dataset["reduce"] = String(reduce);
  }, [reduce]);
  useEffect(() => {
    const el = document.documentElement;
    const on = () => (el.dataset["hidden"] = String(document.hidden));
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  return [reduce, () => setReduce((v) => !v)];
}

export function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [tombs, setTombs] = useState<Tombstone[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [isSample, setIsSample] = useState(true);
  const [repo, setRepo] = useState<string | null>(null);
  const [selected, setSelected] = useState<Tombstone | null>(null);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  /** The hero stones come from the bundled sample, so they always resurrect from the sample files. */
  const [fromHero, setFromHero] = useState(false);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");
  const [scanId, setScanId] = useState(0);
  const [reduce, toggleReduce] = useReduceMotion();
  const yardRef = useRef<HTMLDivElement>(null);

  const reveal = useCallback(() => {
    requestAnimationFrame(() => yardRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  }, []);

  const open = useCallback((t: Tombstone, el: HTMLElement, hero = false) => {
    setOpener(el);
    setFromHero(hero);
    setSelected(t);
  }, []);

  const loadSample = useCallback(
    async (reason: string | null) => {
      setPhase("loading");
      setScanId((n) => n + 1);
      setStatus("Exhuming the cursed repository");
      try {
        const res = await fetch("/samples/cursed.scan.json");
        const data = (await res.json()) as ScanResult;
        setTombs(data.tombstones);
        setNotes(data.notes);
        setSourceLabel("cursed-express-app");
        setIsSample(true);
        setRepo(null);
        setBanner(reason);
        setPhase("ready");
        setStatus(`${data.tombstones.length} packages unearthed`);
        reveal();
      } catch {
        setPhase("idle");
        setError("Could not load the cached sample. Please reload the page.");
      }
    },
    [reveal],
  );

  const runLive = useCallback(
    async (target: string) => {
      setError(null);
      setInfo(null);
      setBanner(null);
      setScanId((n) => n + 1);
      setPhase("loading");
      setStatus("Digging");
      let res: Response;
      try {
        res = await fetch(`/api/scan?repo=${encodeURIComponent(target)}`);
      } catch {
        return loadSample("The live scan could not start. Showing the cached sample instead.");
      }
      if (res.status === 400) {
        setPhase("idle");
        setError(((await res.json().catch(() => null)) as { message?: string } | null)?.message ?? "That does not look like a GitHub repository URL.");
        return;
      }
      if (!res.ok || !res.body) {
        const m = ((await res.json().catch(() => null)) as { message?: string } | null)?.message;
        return loadSample(`${m ?? "The live scan is unavailable."} Showing the cached sample instead.`);
      }
      setTombs([]);
      setNotes([]);
      setIsSample(false);
      setRepo(target);
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let finished = false;
      let failed: string | null = null;
      let notice: string | null = null;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl = buf.indexOf("\n");
          while (nl >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            nl = buf.indexOf("\n");
            if (!line) continue;
            const ev = JSON.parse(line) as ScanEvent;
            if (ev.type === "start") {
              setSourceLabel(ev.source);
              setPhase("streaming");
              reveal();
            } else if (ev.type === "progress") setStatus(ev.message);
            else if (ev.type === "tombstone") setTombs((p) => [...p, ev.data]);
            else if (ev.type === "done") {
              finished = true;
              setTombs(ev.data.tombstones);
              setNotes(ev.data.notes);
              if (ev.data.ecosystem === "unsupported" || ev.data.tombstones.length === 0) {
                notice = ev.data.notes[0] ?? "This repository has no npm dependencies to scan.";
              }
              setPhase("ready");
              setStatus(`${ev.data.tombstones.length} packages unearthed`);
            } else if (ev.type === "error") {
              if (ev.code === "not-found") notice = ev.message;
              else failed = ev.message;
            }
          }
        }
      } catch {
        failed = "The connection dropped during the scan.";
      }
      if (notice) {
        setInfo(notice);
        setTombs([]);
        setPhase("idle");
        return;
      }
      if (failed && !finished) return loadSample(`${failed} Showing the cached sample instead.`);
      if (failed) {
        setError(failed);
        setPhase("idle");
      }
    },
    [loadSample, reveal],
  );

  const busy = phase === "loading" || phase === "streaming";
  const heroOpen = useCallback((t: Tombstone, el: HTMLElement) => open(t, el, true), [open]);

  return (
    <>
      <Hero
        url={url}
        setUrl={setUrl}
        busy={busy}
        onScan={(v) => void runLive(v)}
        onSandbox={() => {
          setUrl(CRYPT_REPO);
          void runLive(CRYPT_REPO);
        }}
        onExpress={() => {
          setUrl(SAMPLE_REPO);
          void runLive(SAMPLE_REPO);
        }}
        onSample={() => void loadSample(null)}
        info={info}
        error={error}
        onOpen={heroOpen}
        reduce={reduce}
        toggleReduce={toggleReduce}
      />

      <main id="main">
        <p role="status" aria-live="polite" className="sr-only">{status}</p>
        <div ref={yardRef} className="scroll-mt-0">
          {phase !== "idle" && (
            <Graveyard
              key={scanId}
              phase={phase}
              tombs={tombs}
              notes={notes}
              banner={banner}
              title={sourceLabel}
              eyebrow={isSample && phase === "ready" ? "Cached sample, loaded instantly" : phase === "streaming" ? "Live scan, tombstones rising" : "Live scan"}
              live={!isSample}
              status={status}
              onOpen={(t, el) => open(t, el, false)}
            />
          )}
        </div>
      </main>

      <footer className="mx-auto mt-auto w-full max-w-[1280px] px-[var(--pad)] pb-12 pt-4 text-[13px] leading-relaxed text-dim">
        Data: npm registry, deps.dev, OSV, OpenSSF Scorecard, GitHub. Built with Kiro. MIT licensed. Fonts: Fraunces, Inter, JetBrains Mono (SIL OFL 1.1).
      </footer>

      <Drawer t={selected} opener={opener} onClose={() => setSelected(null)} repo={fromHero ? null : repo} sample={fromHero ? true : isSample} reduce={reduce} />
    </>
  );
}
