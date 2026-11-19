"use client";

import { useEffect, useRef, useState } from "react";
import type { Evidence, Tombstone } from "@revenant/engine";
import { ResurrectPanel } from "./ResurrectPanel";

const SOURCE_LABEL: Record<string, string> = { npm: "npm registry", "deps.dev": "deps.dev", osv: "OSV", scorecard: "OpenSSF Scorecard", github: "GitHub", curated: "curated by Revenant", manifest: "package.json" };

function Cite({ e }: { e: Evidence }) {
  const inner = (
    <>
      <span className="text-bone-dim">{SOURCE_LABEL[e.source] ?? e.source}</span> <span className="text-moon">{e.field}</span>
    </>
  );
  return e.url ? (
    <a href={e.url} target="_blank" rel="noreferrer" className="font-mono text-[11px] underline decoration-white/20 underline-offset-2 hover:decoration-moon">
      {inner}
    </a>
  ) : (
    <span className="font-mono text-[11px]">{inner}</span>
  );
}

export function TombstoneDialog({ t, onClose, repo, sample }: { t: Tombstone | null; onClose: () => void; repo: string | null; sample: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [raise, setRaise] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (t && !d.open) d.showModal();
    if (!t && d.open) d.close();
    setRaise(false);
  }, [t]);

  const evidenceLines = t ? t.epitaphs.map((e) => `${e.text} [${e.evidence.map((x) => x.field).join(", ")}]`) : [];

  return (
    <dialog ref={ref} className="crypt" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby="crypt-title">
      {t && (
        <div className="max-h-[calc(100dvh-24px)] overflow-y-auto p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-moon">{t.status === "living" ? "Still breathing" : t.status === "dying" ? "On its last breath" : "Here lies"}</p>
              <h2 id="crypt-title" className="mt-1 break-words font-display text-3xl font-semibold sm:text-4xl">
                {t.name} <span className="font-mono text-base font-normal text-bone-dim">{t.version ?? t.requested}</span>
              </h2>
            </div>
            <button onClick={onClose} className="rounded-full border border-white/20 px-3 py-1.5 font-mono text-xs hover:border-ember" aria-label="Close details">Close</button>
          </div>

          <div className="mt-4 flex items-center gap-3" role="img" aria-label={`Vitality ${t.vitality} out of 100`}>
            <div className="h-1.5 w-40 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full ${t.status === "living" ? "bg-lantern" : t.status === "dying" ? "bg-moss" : "bg-stone/60"}`} style={{ width: `${Math.max(t.vitality, 3)}%` }} />
            </div>
            <span className="font-mono text-xs text-bone-dim">vitality {t.vitality}/100</span>
          </div>

          {t.causeOfDeath && (
            <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-ember">Cause of death</h3>
              <p className="mt-2 font-display text-lg leading-snug">{t.causeOfDeath.text.replace(/^Cause of death: /, "")}</p>
              <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1">{t.causeOfDeath.evidence.map((e, i) => <Cite key={i} e={e} />)}</p>
            </section>
          )}

          <section className="mt-6">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-moon">Epitaphs</h3>
            <ul className="mt-3 space-y-3">
              {t.epitaphs.map((e, i) => (
                <li key={i} className="border-l-2 border-white/15 pl-4">
                  <p className="text-[15px]">{e.text}</p>
                  <p className="mt-1 flex flex-wrap gap-x-3">{e.evidence.map((x, k) => <Cite key={k} e={x} />)}</p>
                </li>
              ))}
            </ul>
          </section>

          {t.repository && (
            <p className="mt-4 text-sm text-bone-dim">
              Repository: <a className="text-moon underline underline-offset-2" href={t.repository} target="_blank" rel="noreferrer">{t.repository.replace("https://", "")}</a>
            </p>
          )}

          {t.status !== "living" && (
            <section className="mt-8 border-t border-white/10 pt-6">
              {t.recipeId ? (
                raise ? (
                  <ResurrectPanel pkg={t.name} recipeId={t.recipeId} repo={repo} sample={sample} version={t.version} evidence={evidenceLines} />
                ) : (
                  <button onClick={() => setRaise(true)} className="ember-pulse rounded-full bg-ember px-6 py-3 font-display text-lg font-semibold text-ink transition hover:bg-[#ffa070]">
                    Resurrect {t.name}
                  </button>
                )
              ) : (
                <p className="text-sm text-bone-dim">
                  <span className="font-mono text-xs uppercase tracking-widest text-moon">No curated recipe yet.</span>{" "}
                  {t.successor ? `Suggested successor: ${t.successor.name}. ` : ""}Revenant ships tested migrations for moment, request and uuid@3 only, and will not guess at the rest.
                </p>
              )}
            </section>
          )}
        </div>
      )}
    </dialog>
  );
}
