"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ScanResult, Tombstone } from "@revenant/engine";
import type { ScanEvent } from "@/app/api/scan/route";
import { Plot } from "./Plot";
import { Scene } from "./Scene";
import { TombstoneDialog } from "./TombstoneDialog";

type Phase = "idle" | "loading" | "streaming" | "ready";
type Filter = "all" | "dead" | "dying" | "living";

const SAMPLE_REPO = "https://github.com/expressjs/express";
const CRYPT_REPO = "https://github.com/RamSuryaCH/revenant-crypt";
const ORDER = { dead: 0, dying: 1, living: 2 } as const;

export function App() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [tombs, setTombs] = useState<Tombstone[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
  const [isSample, setIsSample] = useState(true);
  const [repo, setRepo] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Tombstone | null>(null);
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("");
  const heroRef = useRef<HTMLElement>(null);
  const yardRef = useRef<HTMLElement>(null);

  // Pointer parallax, skipped for reduced motion.
  useEffect(() => {
    const el = heroRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--mx", String((e.clientX / window.innerWidth - 0.5) * 2));
        el.style.setProperty("--my", String((e.clientY / window.innerHeight - 0.5) * 2));
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const reveal = useCallback(() => {
    requestAnimationFrame(() => yardRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
  }, []);

  const loadSample = useCallback(
    async (reason: string | null) => {
      setPhase("loading");
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
      setBanner(null);
      setFilter("all");
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
              if (ev.data.ecosystem === "unsupported" || ev.data.tombstones.length === 0) failed = ev.data.notes[0] ?? "No npm dependencies found.";
              setPhase("ready");
              setStatus(`${ev.data.tombstones.length} packages unearthed`);
            } else if (ev.type === "error") failed = ev.message;
          }
        }
      } catch {
        failed = "The connection dropped during the scan.";
      }
      if (failed && !finished) return loadSample(`${failed} Showing the cached sample instead.`);
      if (failed) {
        setError(failed);
        setPhase("idle");
      }
    },
    [loadSample, reveal],
  );

  const counts = useMemo(() => {
    const c = { dead: 0, dying: 0, living: 0 };
    for (const t of tombs) c[t.status]++;
    return c;
  }, [tombs]);
  const direct = tombs.filter((t) => t.direct);
  const score = direct.length ? Math.round((direct.filter((t) => t.status !== "living").length / direct.length) * 100) : 0;
  const shown = useMemo(() => tombs.filter((t) => filter === "all" || t.status === filter).sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.vitality - b.vitality || a.name.localeCompare(b.name)), [tombs, filter]);
  const busy = phase === "loading" || phase === "streaming";

  return (
    <>
      <header ref={heroRef} className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
        <Scene />
        <nav className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-10" aria-label="Primary">
          <span className="font-display text-xl font-semibold tracking-wide">Revenant</span>
          <a href="https://github.com/RamSuryaCH/revenant" className="font-mono text-xs uppercase tracking-[0.2em] text-bone-dim transition-colors hover:text-bone" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
        <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-5 pb-24 text-center">
          <p className="rise font-mono text-[11px] uppercase tracking-[0.35em] text-moon" style={{ ["--i" as string]: 0 }}>Kiroween 2026 · Resurrection</p>
          <h1 className="title-glow rise mt-5 font-display text-[clamp(3.4rem,13vw,9.5rem)] font-semibold leading-[0.92] tracking-tight" style={{ ["--i" as string]: 2 }}>
            Revenant
          </h1>
          <p className="rise mt-6 max-w-2xl font-display text-[clamp(1.15rem,3.4vw,1.75rem)] leading-snug text-bone/90" style={{ ["--i" as string]: 4 }}>
            Your dependencies have a graveyard. Wake the ones your project buried.
          </p>
          <p className="rise mt-4 max-w-xl text-[15px] leading-relaxed text-bone-dim" style={{ ["--i" as string]: 5 }}>
            Every epitaph cites the API field it came from. For moment, request and uuid@3, one click raises a Kiro spec, a patch and property-tested proof.
          </p>

          <div className="rise mt-9 flex w-full max-w-xl flex-col items-stretch gap-3" style={{ ["--i" as string]: 6 }}>
            <button onClick={() => loadSample(null)} disabled={busy} className="ember-pulse rounded-full bg-ember px-8 py-4 font-display text-xl font-semibold text-ink shadow-[0_10px_40px_rgb(255_138_76/0.35)] transition hover:-translate-y-0.5 hover:bg-[#ffa070] disabled:opacity-60">
              {busy ? "Digging…" : "Exhume a cursed repo"}
            </button>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (url.trim()) void runLive(url.trim());
              }}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <label htmlFor="repo-url" className="sr-only">GitHub repository URL</label>
              <input
                id="repo-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder="https://github.com/owner/repo"
                className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/35 px-5 py-3 font-mono text-sm text-bone backdrop-blur placeholder:text-bone-dim/70 focus:border-moon"
              />
              <button type="submit" disabled={busy || !url.trim()} className="rounded-full border border-white/25 px-6 py-3 font-mono text-xs uppercase tracking-[0.18em] text-bone transition hover:border-ember disabled:opacity-40">
                Scan live
              </button>
            </form>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <button type="button" onClick={() => { setUrl(CRYPT_REPO); void runLive(CRYPT_REPO); }} disabled={busy} className="font-mono text-[11px] uppercase tracking-[0.2em] text-moon underline decoration-moon/30 underline-offset-4 hover:text-bone disabled:opacity-40">
                Haunt the sandbox repo (live PRs)
              </button>
              <button type="button" onClick={() => { setUrl(SAMPLE_REPO); void runLive(SAMPLE_REPO); }} disabled={busy} className="font-mono text-[11px] uppercase tracking-[0.2em] text-bone-dim underline decoration-white/20 underline-offset-4 hover:text-bone disabled:opacity-40">
                or scan expressjs/express live
              </button>
            </div>
            {error && <p role="alert" className="rounded-xl border border-ember/40 bg-ember/10 px-4 py-3 text-left text-sm">{error}</p>}
          </div>
        </div>
      </header>

      <main>
        <p role="status" aria-live="polite" className="sr-only">{status}</p>
        {phase !== "idle" && (
          <section ref={yardRef} id="graveyard" className="relative mx-auto max-w-6xl scroll-mt-4 px-4 pb-32 pt-16 sm:px-8" aria-labelledby="yard-title">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-moon">{isSample && phase === "ready" ? "Cached sample · loaded instantly" : phase === "streaming" ? "Live scan · tombstones rising" : "Live scan"}</p>
                <h2 id="yard-title" className="mt-2 font-display text-4xl font-semibold sm:text-5xl">{sourceLabel || "The graveyard"}</h2>
              </div>
              <dl className="flex gap-6 font-mono text-xs">
                <div><dt className="uppercase tracking-widest text-bone-dim">Graveyard score</dt><dd className="mt-1 font-display text-4xl text-ember">{score}%</dd></div>
              </dl>
            </div>

            {banner && <p role="status" className="mt-6 rounded-xl border border-moon/30 bg-moon/10 px-4 py-3 text-sm">{banner}</p>}
            {notes.map((n, i) => <p key={i} className="mt-3 font-mono text-xs text-bone-dim">Note: {n}</p>)}

            <div role="group" aria-label="Filter by status" className="mt-8 flex flex-wrap gap-2">
              {(["all", "dead", "dying", "living"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={`rounded-full border px-4 py-1.5 font-mono text-xs uppercase tracking-widest transition ${filter === f ? "border-ember bg-ember/15 text-bone" : "border-white/15 text-bone-dim hover:text-bone"}`}>
                  {f === "all" ? `All ${tombs.length}` : f === "living" ? `Alive ${counts.living}` : `${f} ${counts[f]}`}
                </button>
              ))}
            </div>

            <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 sm:gap-x-6 md:grid-cols-4 lg:grid-cols-5">
              {shown.map((t, i) => (
                <Plot key={`${t.name}@${t.version}`} t={t} index={i} onOpen={setSelected} />
              ))}
            </div>
            {phase === "streaming" && <p className="mt-10 text-center font-mono text-xs text-moon">{status}…</p>}
            <div className="mt-8 h-px bg-gradient-to-r from-transparent via-moon/30 to-transparent" />
          </section>
        )}
      </main>

      <footer className="px-5 pb-12 pt-4 text-center font-mono text-[11px] leading-relaxed text-bone-dim">
        Data: npm registry · deps.dev · OSV · OpenSSF Scorecard · GitHub. Built with Kiro. MIT licensed.
      </footer>

      <TombstoneDialog t={selected} onClose={() => setSelected(null)} repo={repo} sample={isSample} />
    </>
  );
}
