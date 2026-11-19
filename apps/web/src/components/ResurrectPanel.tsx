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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-ember/15 px-3 py-1 font-mono text-xs text-ember">{r.stats.filesChanged} of {r.stats.filesScanned} files change</span>
        <span className="text-bone-dim">{pkg} → {r.replacement}</span>
      </div>
      <div role="tablist" aria-label="Resurrection output" className="flex gap-1 border-b border-white/10">
        {(["diff", "spec", "tests"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors ${tab === t ? "border-ember text-bone" : "border-transparent text-bone-dim hover:text-bone"}`}>
            {t === "diff" ? "Patch" : t === "spec" ? "Kiro spec" : "Tests"}
          </button>
        ))}
      </div>
      {tab === "diff" && (
        <div className="space-y-3" role="tabpanel">
          {r.patch ? <DiffView patch={r.patch} /> : <p className="text-sm text-bone-dim">Nothing to migrate in the scanned files.</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={download} disabled={!r.patch} className="rounded-full bg-ember px-4 py-2 text-sm font-semibold text-ink transition hover:bg-[#ffa070] disabled:opacity-40">Download .patch</button>
            <button onClick={copy} className="rounded-full border border-white/20 px-4 py-2 font-mono text-xs text-bone hover:border-ember">{copied ? "Copied" : `git apply ${patchName}`}</button>
          </div>
        </div>
      )}
      {tab === "spec" && (
        <div role="tabpanel" className="space-y-3">
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
        <div role="tabpanel" className="space-y-3">
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
