"use client";

import { useEffect, useMemo, useState } from "react";
import type { Resurrection } from "@revenant/engine";

type Tab = "spec" | "diff" | "tests";
type SpecPart = "requirements" | "design" | "tasks";

function DiffView({ patch }: { patch: string }) {
  const lines = useMemo(() => patch.split("\n"), [patch]);
  return (
    <pre className="max-h-[48vh] overflow-auto rounded-lg bg-black/40 p-3 font-mono text-[12px] leading-relaxed" tabIndex={0} aria-label="Unified diff">
      {lines.map((l, i) => {
        const cls = l.startsWith("+++") || l.startsWith("---") || l.startsWith("diff ") || l.startsWith("new file") ? "diff-meta" : l.startsWith("@@") ? "diff-hunk" : l.startsWith("+") ? "diff-add" : l.startsWith("-") ? "diff-del" : "";
        return (
          <div key={i} className={cls}>
            {l || " "}
          </div>
        );
      })}
    </pre>
  );
}

type Gk = { phase: "looking" } | { phase: "found"; url: string; number: number } | { phase: "none" } | { phase: "failed"; message: string };

const isCrypt = (repo: string | null) => !!repo && /(?:^|github\.com\/)ramsuryach\/revenant-crypt(?:\.git)?\/?$/i.test(repo.trim());

/** Shows the live Gravekeeper PR on the sandbox repo. Read-only: the app never writes to GitHub. */
function Gravekeeper({ recipeId }: { recipeId: string }) {
  const [gk, setGk] = useState<Gk>({ phase: "looking" });
  useEffect(() => {
    let alive = true;
    fetch(`/api/gravekeeper?recipe=${encodeURIComponent(recipeId)}`)
      .then(async (res) => {
        const j = (await res.json().catch(() => null)) as { pr?: { url: string; number: number } | null; message?: string } | null;
        if (!res.ok) throw new Error(j?.message ?? `Lookup failed (HTTP ${res.status}).`);
        if (alive) setGk(j?.pr ? { phase: "found", url: j.pr.url, number: j.pr.number } : { phase: "none" });
      })
      .catch((e: unknown) => alive && setGk({ phase: "failed", message: e instanceof Error ? e.message : "Lookup failed." }));
    return () => {
      alive = false;
    };
  }, [recipeId]);
  return (
    <div className="rounded-xl border border-moon/30 bg-moon/[0.07] p-4" aria-live="polite">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-moon">Gravekeeper · live pull request</p>
      {gk.phase === "looking" && <p className="mt-2 text-sm text-bone-dim">Looking for the open pull request on revenant-crypt…</p>}
      {gk.phase === "found" && (
        <p className="mt-2 text-sm">
          <a href={gk.url} target="_blank" rel="noreferrer" className="font-semibold text-ember underline underline-offset-4">Pull request #{gk.number} on RamSuryaCH/revenant-crypt</a>
          <span className="text-bone-dim"> carries this patch, its Kiro spec and the differential tests, with the sandbox suite output in the description.</span>
        </p>
      )}
      {gk.phase === "none" && (
        <p className="mt-2 text-sm text-bone-dim">
          No Gravekeeper pull request is open for this recipe right now. The maintainer opens it with <code className="font-mono text-moon">revenant gravekeeper {recipeId}</code>.
        </p>
      )}
      {gk.phase === "failed" && <p role="alert" className="mt-2 text-sm text-ember">Could not look up the pull request: {gk.message} The patch below still works.</p>}
    </div>
  );
}

export function ResurrectPanel({ pkg, recipeId, repo, sample, version, evidence }: { pkg: string; recipeId: string; repo: string | null; sample: boolean; version: string | null; evidence: string[] }) {
  const [state, setState] = useState<{ phase: "loading" } | { phase: "error"; message: string } | { phase: "ready"; r: Resurrection }>({ phase: "loading" });
  const [tab, setTab] = useState<Tab>("diff");
  const [part, setPart] = useState<SpecPart>("requirements");
  const [copied, setCopied] = useState(false);
  const evidenceKey = evidence.join("\n");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = sample
          ? await fetch(`/samples/${recipeId}.json`)
          : await fetch("/api/resurrect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ repo, recipeId, version, evidence: evidenceKey ? evidenceKey.split("\n") : [] }) });
        if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { message?: string } | null)?.message ?? "Could not resurrect.");
        const r = (await res.json()) as Resurrection;
        if (alive) setState({ phase: "ready", r });
      } catch (e) {
        if (alive) setState({ phase: "error", message: e instanceof Error ? e.message : "Could not resurrect." });
      }
    })();
    return () => {
      alive = false;
    };
  }, [recipeId, repo, sample, version, evidenceKey]);

  if (state.phase === "loading") return <p role="status" className="py-8 text-center font-mono text-sm text-moon">Raising {pkg} from the ground…</p>;
  if (state.phase === "error") return <p role="alert" className="rounded-lg border border-ember/40 bg-ember/10 p-4 text-sm">{state.message}</p>;
  const r = state.r;
  const patchName = `${r.spec.slug}.patch`;
  const download = () => {
    const url = URL.createObjectURL(new Blob([r.patch], { type: "text/x-diff" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = patchName;
    a.click();
    URL.revokeObjectURL(url);
  };
  const copy = async () => {
    await navigator.clipboard?.writeText(`git apply ${patchName}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const TABS = ["diff", "spec", "tests"] as const;
  const onTabKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.indexOf(tab);
    const next = e.key === "ArrowRight" ? (i + 1) % 3 : e.key === "ArrowLeft" ? (i + 2) % 3 : e.key === "Home" ? 0 : e.key === "End" ? 2 : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next]!);
    requestAnimationFrame(() => document.getElementById(`tab-${TABS[next]}`)?.focus());
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4" aria-hidden="true">
        <svg viewBox="0 0 64 80" className="tomb-rise h-14 w-12 shrink-0" focusable="false">
          <path d="M6 80 V30 Q6 6 32 6 Q58 6 58 30 V80 Z" fill="#9097a8" stroke="#c9d3ee" strokeOpacity="0.4" />
          <circle cx="32" cy="38" r="15" fill="#ffd37a" className="tomb-glow" />
          <path d="M0 80 H64" stroke="#0b1020" strokeWidth="6" />
        </svg>
        <span className="tomb-glow font-display text-lg text-lantern">Risen.</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-ember/15 px-3 py-1 font-mono text-xs text-ember">{r.stats.filesChanged} of {r.stats.filesScanned} files change</span>
        <span className="text-bone-dim">{pkg} → {r.replacement}</span>
      </div>
      <div role="tablist" aria-label="Resurrection output" className="flex gap-1 border-b border-white/10" onKeyDown={onTabKey}>
        {TABS.map((t) => (
          <button key={t} id={`tab-${t}`} role="tab" aria-selected={tab === t} aria-controls={`panel-${t}`} tabIndex={tab === t ? 0 : -1} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${tab === t ? "border-ember text-bone" : "border-transparent text-bone-dim hover:text-bone"}`}>
            {t === "diff" ? "Patch" : t === "spec" ? "Kiro spec" : "Tests"}
          </button>
        ))}
      </div>
      {tab === "diff" && (
        <div className="space-y-3" role="tabpanel" id="panel-diff" aria-labelledby="tab-diff">
          {!sample && repo && isCrypt(repo) && r.patch && <Gravekeeper recipeId={recipeId} />}
          {r.patch ? <DiffView patch={r.patch} /> : <p className="text-sm text-bone-dim">Nothing to migrate in the scanned files.</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={download} disabled={!r.patch} className="rounded-full bg-ember px-4 py-2 text-sm font-semibold text-ink transition hover:bg-[#ffa070] disabled:opacity-40">Download .patch</button>
            <button onClick={copy} className="rounded-full border border-white/20 px-4 py-2 font-mono text-xs text-bone hover:border-ember">{copied ? "Copied" : `git apply ${patchName}`}</button>
          </div>
        </div>
      )}
      {tab === "spec" && (
        <div role="tabpanel" id="panel-spec" aria-labelledby="tab-spec" className="space-y-3">
          <p className="text-sm text-bone-dim">Drop these into <code className="font-mono text-moon">.kiro/specs/{r.spec.slug}/</code>.</p>
          <div className="flex gap-2">
            {(["requirements", "design", "tasks"] as const).map((p) => (
              <button key={p} onClick={() => setPart(p)} aria-pressed={part === p} className={`rounded-full px-3 py-1 font-mono text-xs ${part === p ? "bg-moon/20 text-bone" : "text-bone-dim hover:text-bone"}`}>{p}.md</button>
            ))}
          </div>
          <pre className="max-h-[48vh] overflow-auto whitespace-pre-wrap rounded-lg bg-black/40 p-4 font-mono text-[12px] leading-relaxed" tabIndex={0}>{r.spec[part]}</pre>
        </div>
      )}
      {tab === "tests" && (
        <div role="tabpanel" id="panel-tests" aria-labelledby="tab-tests" className="space-y-3">
          <p className="text-sm text-bone-dim">Differential property-based tests (fast-check) compare the old and new behaviour. Run: <code className="break-all font-mono text-moon">{r.tests.runCommand}</code></p>
          <pre className="max-h-[48vh] overflow-auto rounded-lg bg-black/40 p-4 font-mono text-[12px] leading-relaxed" tabIndex={0}><code>{r.tests.content}</code></pre>
        </div>
      )}
      {r.notes.length > 0 && (
        <details className="rounded-lg border border-white/10 p-3 text-sm">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-moon">Honest notes ({r.notes.length})</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-bone-dim">{r.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </details>
      )}
    </div>
  );
}
