"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Resurrection, Tombstone } from "@revenant/engine";
import { artifactFacts, clampAtWord } from "@/lib/ledger";
import { friendlyError, withStop } from "@/lib/messages";
import { scopeLabel } from "@/lib/repo";
import { isCrypt, PrCard, useGravekeeper } from "./PrCard";

interface Props {
  t: Tombstone;
  recipeId: string;
  repo: string | null;
  sample: boolean;
  evidence: string[];
  cached: Resurrection | null;
  reduce: boolean;
  onResult: (r: Resurrection) => void;
  onClose: () => void;
}

type Phase = "playing" | "done" | "failed";

const STEPS = ["The stone cracks", "Ember light through the crack", "The successor takes the name", "A spec, a patch and tests", "The pull request"] as const;
const shortName = (s: string) => s.replace(/\s*\(.*$/, "");
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function load(p: Pick<Props, "recipeId" | "repo" | "sample" | "evidence"> & { version: string | null }): Promise<Resurrection> {
  const res = p.sample
    ? await fetch(`/samples/${p.recipeId}.json`)
    : await fetch("/api/resurrect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ repo: p.repo, recipeId: p.recipeId, version: p.version, evidence: p.evidence }) });
  if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { message?: string } | null)?.message ?? "Could not resurrect.");
  return (await res.json()) as Resurrection;
}

/** Ember motes on a 2D canvas. Only runs during the ember beat; stops when cancelled. */
function startMotes(canvas: HTMLCanvasElement, count: number, anchor: HTMLElement): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const w = (canvas.width = canvas.clientWidth);
  const h = (canvas.height = canvas.clientHeight);
  const a = anchor.getBoundingClientRect();
  const ox = a.left + a.width / 2;
  const oy = a.top + a.height * 0.6;
  const ps = Array.from({ length: count }, (_, i) => ({ x: ox + (Math.sin(i * 12.9898) * 90), y: oy + ((i * 37) % 80), vy: 0.4 + ((i * 13) % 10) / 10, vx: Math.sin(i) * 0.3, r: 1 + (i % 3), life: (i * 29) % 100 }));
  let raf = 0;
  const tick = () => {
    ctx.clearRect(0, 0, w, h);
    for (const p of ps) {
      p.y -= p.vy;
      p.x += p.vx + Math.sin((p.y + p.life) / 30) * 0.3;
      p.life += 1;
      if (p.y < oy - 320) {
        p.y = oy + 20;
        p.x = ox + Math.sin(p.life) * 90;
      }
      const a = Math.max(0, 1 - (oy - p.y) / 320);
      ctx.fillStyle = `rgba(255,138,76,${(a * 0.9).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, w, h);
  };
}

export function ResurrectSequence(props: Props) {
  const { t, recipeId, reduce, onClose } = props;
  const latest = useRef(props);
  latest.current = props;
  const rRef = useRef<Resurrection | null>(props.cached);
  const dlg = useRef<HTMLDialogElement>(null);
  const [run, setRun] = useState(0);
  const [phase, setPhase] = useState<Phase>("playing");
  const [caption, setCaption] = useState<string>(STEPS[0]);
  const [r, setR] = useState<Resurrection | null>(props.cached);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const gk = useGravekeeper(recipeId);
  const retry = useRef<HTMLButtonElement>(null);

  // Keyboard users land on "Try again" when an attempt fails.
  useEffect(() => {
    if (error) retry.current?.focus();
  }, [error, phase]);

  // Layers the timeline drives.
  const root = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const crack = useRef<SVGPathElement>(null);
  const stone = useRef<HTMLDivElement>(null);
  const strike = useRef<HTMLElement>(null);
  const typed = useRef<HTMLParagraphElement>(null);
  const cardEls = useRef<Array<HTMLDivElement | null>>([]);
  const cards = useRef<HTMLDivElement>(null);
  const pr = useRef<HTMLDivElement>(null);
  const motes = useRef<HTMLCanvasElement>(null);
  const skip = useRef<() => void>(() => {});
  const phaseRef = useRef<Phase>("playing");
  phaseRef.current = phase;

  useEffect(() => {
    const d = dlg.current;
    if (d && !d.open) d.showModal();
  }, []);

  const fetchOnce = useCallback(async () => {
    if (rRef.current) return rRef.current;
    const p = latest.current;
    const data = await load({ recipeId: p.recipeId, repo: p.repo, sample: p.sample, evidence: p.evidence, version: p.t.version });
    rRef.current = data;
    setR(data);
    p.onResult(data);
    return data;
  }, []);

  // Reduced motion: fetch once, advance by buttons.
  useEffect(() => {
    if (!reduce) return;
    let alive = true;
    setError(null);
    fetchOnce().catch((e: unknown) => alive && setError(friendlyError(e)));
    return () => {
      alive = false;
    };
  }, [reduce, fetchOnce, run]);

  // The one timeline.
  useEffect(() => {
    if (reduce) return;
    const els = { root: root.current, glow: glow.current, crack: crack.current, stone: stone.current, strike: strike.current, typed: typed.current, cards: cards.current, pr: pr.current };
    if (!els.root || !els.glow || !els.crack || !els.stone || !els.strike || !els.typed || !els.cards || !els.pr) return;
    const { root: rootEl, glow: glowEl, crack: crackEl, stone: stoneEl, strike: strikeEl, typed: typedEl, cards: cardsEl, pr: prEl } = els;

    let cancelled = false;
    let skipped = false;
    let releaseGate: () => void = () => {};
    const gate = new Promise<void>((res) => (releaseGate = res));
    const anims: Animation[] = [];
    let stopMotes = () => {};
    const A = (el: Element, kf: Keyframe[] | PropertyIndexedKeyframes, o: KeyframeAnimationOptions) => {
      const a = el.animate(kf, { fill: "both", ...o });
      anims.push(a);
      return a;
    };
    const finishAll = () => anims.forEach((a) => a.playState !== "finished" && a.finish());
    skip.current = () => {
      skipped = true;
      finishAll();
      releaseGate();
    };

    setPhase("playing");
    setError(null);
    setCaption(STEPS[0]);

    // Phase 1: stage, crack, ember. Does not depend on data.
    A(rootEl, [{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: "cubic-bezier(0.4,0,0.2,1)" });
    A(stoneEl, [{ opacity: 0, transform: "translate3d(0,24px,0)" }, { opacity: 1, transform: "translate3d(0,0,0)" }], { duration: 480, delay: 120, easing: "cubic-bezier(0.16,1,0.3,1)" });
    const crackAnim = A(crackEl, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 700, delay: 600, easing: "cubic-bezier(0.65,0,0.35,1)" });
    A(stoneEl, [{ transform: "translate3d(0,0,0)" }, { transform: "translate3d(1px,0,0)" }, { transform: "translate3d(-1px,0,0)" }, { transform: "translate3d(1px,0,0)" }, { transform: "translate3d(0,0,0)" }], { duration: 120, delay: 1250, fill: "none" });
    const glowIn = A(glowEl, [{ opacity: 0, transform: "scale(0.6)" }, { opacity: 1, transform: "scale(1)" }], { duration: 800, delay: 1300, easing: "cubic-bezier(0.4,0,0.2,1)" });
    const breathe = glowEl.animate([{ opacity: 1 }, { opacity: 0.75 }, { opacity: 1 }], { duration: 1400, delay: 2100, iterations: Infinity });
    const motesTimer = setTimeout(() => {
      if (!cancelled && motes.current && !skipped) stopMotes = startMotes(motes.current, window.innerWidth < 768 ? 24 : 40, stoneEl);
    }, 1300);
    const capTimers = [setTimeout(() => setCaption(STEPS[1]), 1300)];

    const data = fetchOnce();
    data.catch(() => {});
    const phase1 = Promise.race([sleep(2100), gate]);

    (async () => {
      let res: Resurrection;
      try {
        [, res] = await Promise.all([phase1, data]);
      } catch (e) {
        if (cancelled) return;
        // Failure: close the crack, fade the ember, show plain text and a retry.
        breathe.cancel();
        stopMotes();
        crackAnim.reverse();
        glowIn.reverse();
        setError(friendlyError(e));
        setPhase("failed");
        setCaption("The resurrection failed");
        return;
      }
      if (cancelled) return;
      // Hold-until-data is implicit: breathe loops from 2.1 s until the response is in.
      // Wait two frames so React has rendered the real numbers the cards count up to.
      await new Promise<void>((ok) => requestAnimationFrame(() => requestAnimationFrame(() => ok())));
      if (cancelled) return;
      breathe.cancel();
      const f = artifactFacts(res);
      setCaption(STEPS[2]);
      A(strikeEl, [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: 160 });
      const len = Math.max(1, shortName(f.replacement).length);
      A(typedEl, [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }], { duration: 45 * len, delay: 200, easing: `steps(${len}, end)` });
      const ci = cardEls.current.filter((c): c is HTMLDivElement => !!c);
      ci.forEach((c, i) => {
        A(c, [{ opacity: 0.35, transform: "translate3d(0,8px,0) scale(0.99)", borderStyle: "dashed" }, { opacity: 1, transform: "translate3d(0,0,0) scale(1)", borderStyle: "solid" }], { duration: 240, delay: 800 + i * 160, easing: "cubic-bezier(0.16,1,0.3,1)" });
        c.querySelectorAll<HTMLElement>("[data-count]").forEach((n) => A(n, [{ ["--n" as string]: "0" }, { ["--n" as string]: n.dataset["count"] ?? "0" }], { duration: 700, delay: 800 + i * 160, easing: "cubic-bezier(0.16,1,0.3,1)" }));
      });
      capTimers.push(setTimeout(() => setCaption(STEPS[3]), 800));
      // Cards stack away, the PR card takes their place, then the stage pulls back.
      // Wide screens keep the three artifact cards beside the stone under the PR card; narrow ones swap them.
      if (!window.matchMedia("(min-width: 900px)").matches) A(cardsEl, [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(0.96)" }], { duration: 400, delay: 1900, easing: "cubic-bezier(0.4,0,0.2,1)" });
      A(prEl, [{ opacity: 0, transform: "translate3d(0,16px,0)" }, { opacity: 1, transform: "translate3d(0,0,0)" }], { duration: 600, delay: 2000, easing: "cubic-bezier(0.16,1,0.3,1)" });
      capTimers.push(setTimeout(() => setCaption(STEPS[4]), 2000));
      A(rootEl, [{ transform: "scale(1)" }, { transform: "scale(0.94)" }], { duration: 600, delay: 2500, easing: "cubic-bezier(0.65,0,0.35,1)" });
      A(stoneEl, [{ boxShadow: "inset 0 0 0 2px rgba(0,0,0,.1), inset 0 3px 0 rgba(255,255,255,.5), 0 30px 60px -20px #000" }, { boxShadow: "inset 0 0 0 3px #d9541e, inset 0 3px 0 rgba(255,255,255,.5), 0 0 60px 4px rgba(255,138,76,.45)" }], { duration: 600, delay: 2500 });
      if (skipped) finishAll();
      setTimeout(stopMotes, 2200);
      await Promise.all(anims.map((a) => a.finished.catch(() => {})));
      if (!cancelled) {
        setPhase("done");
        setCaption(`Resurrected. ${f.patch.files} ${f.patch.files === 1 ? "file" : "files"} changed, spec, tests and pull request ready.`);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(motesTimer);
      capTimers.forEach(clearTimeout);
      stopMotes();
      anims.forEach((a) => a.cancel());
      breathe.cancel();
      skip.current = () => {};
    };
  }, [reduce, run, fetchOnce]);

  const close = () => dlg.current?.close();
  const facts = r ? artifactFacts(r) : null;
  const crypt = isCrypt(props.repo);
  const scope = scopeLabel(props.repo, props.sample);
  const typedName = shortName(facts?.replacement ?? "");

  return (
    <dialog
      ref={dlg}
      className="stage"
      aria-labelledby="stage-title"
      onCancel={(e) => {
        if (!reduce && phaseRef.current === "playing") {
          e.preventDefault();
          skip.current();
          return;
        }
        e.preventDefault();
        dlg.current?.close();
      }}
      onClose={onClose}
    >
      <div className="stage-skip">
        {!reduce && phase === "playing" && <button type="button" className="btn-ghost" onClick={() => skip.current()}>Skip</button>}
        <button type="button" className="btn-ghost" onClick={close}>Close</button>
      </div>
      <h2 id="stage-title" className="sr-only">Resurrecting {t.name}</h2>
      <p role="status" aria-live="polite" className="sr-only">{caption}</p>
      <canvas ref={motes} className="motes" aria-hidden="true" hidden={reduce} />

      {!reduce ? (
        <div ref={root} className="stage-inner" style={{ opacity: 0 }}>
          <div ref={stone} className="big-stone" style={{ opacity: 0 }}>
            <div ref={glow} className="glow" style={{ opacity: 0 }} aria-hidden="true" />
            <svg className="crackline" viewBox="0 0 300 400" preserveAspectRatio="none" aria-hidden="true" focusable="false">
              <path ref={crack} d="M150 20 L138 90 L162 150 L130 220 L158 280 L140 340 L150 400" pathLength={1} strokeDasharray={1} strokeDashoffset={1} fill="none" stroke="#0b0e16" strokeWidth="3" strokeLinejoin="round" />
            </svg>
            <div className="names">
              <span className="t-label" style={{ color: "var(--color-stone-text)" }}>Here lies</span>
              <p className="old-name carved">{t.name}<i ref={strike} /></p>
              <p ref={typed} className="new-name" aria-hidden={!typedName}>{typedName}</p>
              <span className="t-evidence" style={{ color: "var(--color-stone-text)" }}>{t.version ?? t.requested}</span>
            </div>
          </div>
          <div className="stage-right">
            <div ref={cards} className="cards">
              {[
                { k: "Patch", v: facts ? <><span className="num add">+<span className="count" data-count={facts.patch.added} aria-label={String(facts.patch.added)} /></span> <span className="num del">−<span className="count" data-count={facts.patch.removed} aria-label={String(facts.patch.removed)} /></span> in {facts.patch.files} {facts.patch.files === 1 ? "file" : "files"}</> : "…" },
                { k: "Kiro spec", v: facts ? <>{facts.spec.files.join(", ")} in <span className="num">{facts.spec.dir}</span></> : "…" },
                { k: "Tests", v: facts ? <><span className="count num" data-count={facts.tests.properties} aria-label={String(facts.tests.properties)} /> differential properties in <span className="num">{facts.tests.path}</span></> : "…" },
              ].map((c, i) => (
                <div key={c.k} ref={(el) => { cardEls.current[i] = el; }} className="acard">
                  <span className="t-label k">{c.k}</span>
                  <span className="v">{c.v}</span>
                </div>
              ))}
            </div>
            <div ref={pr} className="stage-pr" style={{ opacity: 0 }}>
              {r && <PrCard recipeId={recipeId} gk={gk} crypt={crypt} r={r} scope={scope} compact />}
            </div>
          </div>
        </div>
      ) : (
        <div className="stage-inner" style={{ gridTemplateColumns: "1fr", maxWidth: 680 }}>
          <div style={{ width: "100%" }}>
            <p className="t-label text-ember">Step {step + 1} of {STEPS.length}</p>
            <h3 className="t-title mt-2">{STEPS[step]}</h3>
            <div className="mt-4 min-h-[160px] text-[17px] leading-relaxed text-mist" aria-live="polite">
              {step === 0 && <p><span className="font-display text-bone">{t.name}</span> {t.version ?? t.requested} is dead. {clampAtWord(t.epitaphs[0]?.text ?? "", 160)}</p>}
              {step === 1 && <p>{r ? "The recipe response is in: real files from the sample, scanned and migrated." : error ? error : "Waiting for the recipe response."}</p>}
              {step === 2 && (facts ? <p><span className="font-display text-bone line-through">{t.name}</span> becomes <span className="t-evidence text-ember" style={{ fontSize: 20 }}>{facts.replacement}</span>.</p> : <p>{error ?? "Waiting for the response."}</p>)}
              {step === 3 && (facts ? (
                <ul className="list-disc space-y-1 pl-5">
                  <li>Patch: +{facts.patch.added} −{facts.patch.removed} in {facts.patch.files} {facts.patch.files === 1 ? "file" : "files"}</li>
                  <li>Kiro spec: {facts.spec.files.join(", ")} in {facts.spec.dir}</li>
                  <li>Tests: {facts.tests.properties} differential properties in {facts.tests.path}</li>
                </ul>
              ) : <p>{error ?? "Waiting for the response."}</p>)}
              {step === 4 && (r ? <PrCard recipeId={recipeId} gk={gk} crypt={crypt} r={r} scope={scope} /> : <p>{error ?? "Waiting for the response."}</p>)}
            </div>
            <div className="steps-nav">
              <button type="button" className="btn-ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</button>
              <button type="button" className="btn-ghost" disabled={step === STEPS.length - 1} onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Next</button>
              {error && <button ref={retry} type="button" className="btn-ember" onClick={() => setRun((n) => n + 1)}>Try again</button>}
            </div>
          </div>
        </div>
      )}

      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "14px var(--pad) calc(14px + env(safe-area-inset-bottom))", display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        {phase === "failed" && (
          <>
            <p role="alert" className="w-full text-center text-[15px] text-ember">{withStop(error ?? "Could not resurrect")} The crack closed. Nothing was written anywhere.</p>
            <button ref={retry} type="button" className="btn-ember" onClick={() => setRun((n) => n + 1)}>Try again</button>
          </>
        )}
        {(phase === "done" || (reduce && r && step === STEPS.length - 1)) && (
          <>
            <button type="button" className="btn-ember" onClick={close}>See the patch, spec and tests</button>
            {!reduce && <button type="button" className="btn-ghost" onClick={() => setRun((n) => n + 1)}>Replay</button>}
          </>
        )}
      </div>
    </dialog>
  );
}
