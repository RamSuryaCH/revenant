"use client";

import { useEffect, useMemo, useState } from "react";
import type { Resurrection } from "@revenant/engine";
import { artifactFacts } from "@/lib/ledger";
import { sandboxProof } from "@/lib/proof";
import { parsePrTotals, type PrTotals } from "@/lib/repo";
import { ExternalIcon } from "./Glyph";

export type Gk = { phase: "looking" } | { phase: "found"; url: string; number: number; totals: PrTotals | null } | { phase: "none" } | { phase: "failed"; message: string };

const SANDBOX = "RamSuryaCH/revenant-crypt";
export const isCrypt = (repo: string | null) => !!repo && /(?:^|github\.com\/)ramsuryach\/revenant-crypt(?:\.git)?\/?$/i.test(repo.trim());

/** Read-only lookup of the open Gravekeeper PR for one recipe. The app never writes to GitHub. */
export function useGravekeeper(recipeId: string): Gk {
  const [gk, setGk] = useState<Gk>({ phase: "looking" });
  useEffect(() => {
    let alive = true;
    fetch(`/api/gravekeeper?recipe=${encodeURIComponent(recipeId)}`)
      .then(async (res) => {
        const j = (await res.json().catch(() => null)) as { pr?: { url: string; number: number } | null; totals?: unknown; message?: string } | null;
        if (!res.ok) throw new Error(j?.message ?? `Lookup failed (HTTP ${res.status}).`);
        if (alive) setGk(j?.pr && j.pr.url.startsWith("https://github.com/") ? { phase: "found", url: j.pr.url, number: j.pr.number, totals: parsePrTotals(j.totals) } : { phase: "none" });
      })
      .catch((e: unknown) => alive && setGk({ phase: "failed", message: e instanceof Error ? e.message : "Lookup failed." }));
    return () => {
      alive = false;
    };
  }, [recipeId]);
  return gk;
}

/** The PR result. Honest in every state: found, not found, lookup failed. */
export function PrCard({ recipeId, gk, crypt, r, scope, compact = false }: { recipeId: string; gk: Gk; crypt: boolean; r: Resurrection; scope: string; compact?: boolean }) {
  const facts = artifactFacts(r);
  const proof = sandboxProof(recipeId);
  return (
    <div className="prcard" aria-live="polite">
      <p className="t-label text-ember">Pull request</p>
      {gk.phase === "looking" && <p className="text-mist">Looking for the open pull request on {SANDBOX}…</p>}
      {gk.phase === "found" && (
        <>
          <p className="flex flex-wrap items-center gap-3">
            <span className="font-display" style={{ fontSize: 22 }}>#{gk.number}</span>
            <span className="chip-open">Open</span>
            <span className="t-evidence text-mist">{SANDBOX}</span>
          </p>
          <a className="inline-flex min-h-11 items-center gap-2 font-medium text-ember underline underline-offset-4" href={gk.url} target="_blank" rel="noreferrer">
            Open the pull request on GitHub <ExternalIcon />
          </a>
          {!compact && (
            <p className="text-[15px] text-mist">
              {crypt ? "Opened by the Gravekeeper on the sandbox repo. It carries this patch, its Kiro spec and the differential tests." : "The same recipe applied to our sandbox repo. This is a different repo from the one you scanned, so use the patch below for yours."}
            </p>
          )}
          <p className="text-[13px] text-dim">Revenant only reads this pull request. Clicking Resurrect does not create it.</p>
        </>
      )}
      {gk.phase === "none" && <p className="text-mist">No open pull request exists for this recipe right now. The patch, spec and tests are ready.</p>}
      {gk.phase === "failed" && <p role="alert" className="text-ember">Could not look up the pull request: {gk.message} The patch still works.</p>}
      <p className="t-evidence text-mist">
        Patch to {scope}, source files only: <span className="add">+{facts.patch.added}</span> <span className="del">−{facts.patch.removed}</span> in {facts.patch.files} {facts.patch.files === 1 ? "file" : "files"}
      </p>
      {gk.phase === "found" && gk.totals && (
        <p className="t-evidence text-mist">
          Whole pull request #{gk.number} on GitHub, with its Kiro spec and tests: <span className="add">+{gk.totals.additions}</span> <span className="del">−{gk.totals.deletions}</span> in {gk.totals.files} {gk.totals.files === 1 ? "file" : "files"}
        </p>
      )}
      {proof && (proof.suiteOk || proof.diffPassed) ? (
        <p className="t-evidence text-mist">
          Recorded run on the sandbox repo:
          {proof.suiteOk && <> suite {proof.suitePass} of {proof.suiteTotal} pass</>}
          {proof.diffPassed ? <>{proof.suiteOk ? " · " : " "}{proof.diffPassed} differential tests pass</> : null}
        </p>
      ) : null}
      {proof && !compact && <p className="text-[13px] text-dim">Recorded {proof.date} on {SANDBOX} at {proof.baseSha} by scripts/verify-crypt.mts.</p>}
    </div>
  );
}

function DiffView({ patch }: { patch: string }) {
  const lines = useMemo(() => patch.split("\n"), [patch]);
  return (
    <pre className="codebox" tabIndex={0} aria-label="Unified diff">
      {lines.map((l, i) => {
        const cls = l.startsWith("+++") || l.startsWith("---") || l.startsWith("diff ") || l.startsWith("new file") ? "diff-meta" : l.startsWith("@@") ? "diff-hunk" : l.startsWith("+") ? "diff-add" : l.startsWith("-") ? "diff-del" : "";
        return <div key={i} className={cls}>{l || " "}</div>;
      })}
    </pre>
  );
}

type Tab = "diff" | "spec" | "tests";
type SpecPart = "requirements" | "design" | "tasks";
const TABS = ["diff", "spec", "tests"] as const;

/** PR card, then the patch, spec and tests viewer. */
export function ResultView({ r, recipeId, crypt, scope }: { r: Resurrection; recipeId: string; crypt: boolean; scope: string }) {
  const gk = useGravekeeper(recipeId);
  const [tab, setTab] = useState<Tab>("diff");
  const [part, setPart] = useState<SpecPart>("requirements");
  const [copied, setCopied] = useState(false);
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
  const onTabKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.indexOf(tab);
    const next = e.key === "ArrowRight" ? (i + 1) % 3 : e.key === "ArrowLeft" ? (i + 2) % 3 : e.key === "Home" ? 0 : e.key === "End" ? 2 : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next]!);
    requestAnimationFrame(() => document.getElementById(`tab-${TABS[next]}`)?.focus());
  };

  return (
    <div className="space-y-5">
      <PrCard recipeId={recipeId} gk={gk} crypt={crypt} r={r} scope={scope} />
      <div className="flex flex-wrap items-center gap-2 text-[15px] text-mist">
        <span className="chip">{r.stats.filesChanged} of {r.stats.filesScanned} files change</span>
        <span>{r.package} → {r.replacement}</span>
      </div>
      <div role="tablist" aria-label="Resurrection output" className="tabs" onKeyDown={onTabKey}>
        {TABS.map((t) => (
          <button key={t} id={`tab-${t}`} type="button" role="tab" aria-selected={tab === t} aria-controls={`panel-${t}`} tabIndex={tab === t ? 0 : -1} onClick={() => setTab(t)}>
            {t === "diff" ? "Patch" : t === "spec" ? "Kiro spec" : "Tests"}
          </button>
        ))}
      </div>
      {tab === "diff" && (
        <div className="space-y-3" role="tabpanel" id="panel-diff" aria-labelledby="tab-diff">
          {r.patch ? <DiffView patch={r.patch} /> : <p className="text-mist">Nothing to migrate in the scanned files.</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn-ember" onClick={download} disabled={!r.patch}>Download .patch</button>
            <button type="button" className="btn-ghost t-evidence" onClick={copy}>{copied ? "Copied" : `git apply ${patchName}`}</button>
          </div>
        </div>
      )}
      {tab === "spec" && (
        <div role="tabpanel" id="panel-spec" aria-labelledby="tab-spec" className="space-y-3">
          <p className="text-[15px] text-mist">Drop these into <code className="t-evidence text-moon">.kiro/specs/{r.spec.slug}/</code>.</p>
          <div className="flex flex-wrap gap-2">
            {(["requirements", "design", "tasks"] as const).map((p) => (
              <button key={p} type="button" className="btn-ghost t-evidence" aria-pressed={part === p} style={part === p ? { borderColor: "var(--color-ember)" } : undefined} onClick={() => setPart(p)}>{p}.md</button>
            ))}
          </div>
          <pre className="codebox whitespace-pre-wrap" tabIndex={0}>{r.spec[part]}</pre>
        </div>
      )}
      {tab === "tests" && (
        <div role="tabpanel" id="panel-tests" aria-labelledby="tab-tests" className="space-y-3">
          <p className="text-[15px] text-mist">Differential property-based tests (fast-check) compare the old and new behaviour. Run: <code className="t-evidence break-all text-moon">{r.tests.runCommand}</code></p>
          <pre className="codebox" tabIndex={0}><code>{r.tests.content}</code></pre>
        </div>
      )}
      {r.notes.length > 0 && (
        <details className="rounded-xl border border-rule p-4 text-[15px]">
          <summary className="t-label cursor-pointer text-moon">Honest notes ({r.notes.length})</summary>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-mist">{r.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
        </details>
      )}
    </div>
  );
}
