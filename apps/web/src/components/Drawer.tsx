"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Resurrection, Tombstone } from "@revenant/engine";
import { clampAtWord, evidenceRows, STATUS_WORD, type Chip, type EvidenceRow } from "@/lib/ledger";
import { ExternalIcon, Glyph } from "./Glyph";
import { isCrypt } from "./PrCard";

const ResultView = dynamic(() => import("./PrCard").then((m) => m.ResultView), { ssr: false, loading: () => <p className="text-mist">Loading the result…</p> });
const ResurrectSequence = dynamic(() => import("./ResurrectSequence").then((m) => m.ResurrectSequence), { ssr: false });
const preload = () => void import("./ResurrectSequence");

function Source({ c }: { c: Chip }) {
  const inner = (
    <>
      <b>{c.label}</b>
      {c.url && <ExternalIcon />}
    </>
  );
  return c.url ? (
    <a className="chip" href={c.url} target="_blank" rel="noreferrer" aria-label={`${c.label}, opens in a new tab`}>{inner}</a>
  ) : (
    <span className="chip">{inner}</span>
  );
}

const GROUP_LABEL = { cause: "Cause of death", epitaph: "Epitaph", successor: "Successor" } as const;

function EvidenceTable({ rows }: { rows: EvidenceRow[] }) {
  return (
    <table className="ev">
      <caption className="sr-only">Every claim and the API field it was read from</caption>
      <colgroup><col style={{ width: "38%" }} /><col style={{ width: "34%" }} /><col style={{ width: "28%" }} /></colgroup>
      <thead>
        <tr><th scope="col">Claim</th><th scope="col">Field</th><th scope="col">Source</th></tr>
      </thead>
      <tbody>
        {rows.flatMap((row, ri) =>
          row.chips.map((c, ci) => (
            <tr key={`${ri}-${ci}`} style={{ ["--i" as string]: ri }}>
              {ci === 0 && (
                <td rowSpan={row.chips.length}>
                  <span className="t-label block pb-1 text-dim">{GROUP_LABEL[row.group]}</span>
                  {row.group === "cause" ? `${clampAtWord(row.claim, 80)} (in full above)` : row.claim}
                </td>
              )}
              <td><span className="field">{c.field}</span></td>
              <td><Source c={c} /></td>
            </tr>
          )),
        )}
      </tbody>
    </table>
  );
}

export function Drawer({ t, opener, onClose, repo, sample, reduce }: { t: Tombstone | null; opener: HTMLElement | null; onClose: () => void; repo: string | null; sample: boolean; reduce: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [stage, setStage] = useState(false);
  const [result, setResult] = useState<Resurrection | null>(null);
  const [copied, setCopied] = useState(false);
  const drag = useRef<{ y: number } | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (t && !d.open) d.showModal();
    if (!t && d.open) d.close();
    setStage(false);
    setResult(null);
    setCopied(false);
  }, [t]);

  const onResult = useCallback((r: Resurrection) => setResult(r), []);
  const closed = () => {
    onClose();
    // Native dialogs restore focus; do it explicitly so it also holds for list rows that re-render.
    requestAnimationFrame(() => opener?.isConnected && opener.focus());
  };

  const rows = t ? evidenceRows(t) : [];
  const table = rows.filter((r) => r.group !== "successor");
  const successor = rows.find((r) => r.group === "successor");
  const evidenceLines = t ? t.epitaphs.map((e) => `${e.text} [${e.evidence.map((x) => x.field).join(", ")}]`).slice(0, 8) : [];
  const lit = t ? Math.max(t.status === "living" ? 1 : 0, Math.ceil(t.vitality / 20)) : 0;

  const copy = async () => {
    await navigator.clipboard?.writeText(JSON.stringify({ name: t?.name, version: t?.version, status: t?.status, evidence: rows }, null, 2)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <>
      <dialog
        ref={ref}
        className="drawer"
        onClose={closed}
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        aria-labelledby="drawer-title"
      >
        {t && (
          <>
            <div
              className="grab"
              aria-hidden="true"
              onPointerDown={(e) => {
                drag.current = { y: e.clientY };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!drag.current || !ref.current) return;
                const dy = Math.max(0, e.clientY - drag.current.y);
                ref.current.style.transform = `translate3d(0,${dy}px,0)`;
              }}
              onPointerUp={(e) => {
                if (!drag.current || !ref.current) return;
                const dy = e.clientY - drag.current.y;
                drag.current = null;
                ref.current.style.transform = "";
                if (dy > 90) ref.current.close();
              }}
            >
              <i />
            </div>
            <div className="drawer-body">
              <div className="flex items-start justify-between gap-4">
                <p className={`t-label flex items-center gap-2 s-${t.status}`}>
                  <Glyph status={t.status} />
                  {t.status === "living" ? "Still breathing" : t.status === "dying" ? "On its last breath" : "Here lies"} · {STATUS_WORD[t.status]}
                </p>
                <button type="button" className="btn-ghost" onClick={() => ref.current?.close()} aria-label="Close details">Close</button>
              </div>
              <h2 id="drawer-title" className="t-display wrap-any mt-3" style={{ fontSize: "clamp(34px, 8vw, 56px)" }}>{t.name}</h2>
              <p className="t-evidence mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-mist">
                <span>{t.version ?? t.requested}</span>
                <span className="flex items-center gap-2" role="img" aria-label={`Vitality ${t.vitality} out of 100`}>
                  <span className="vit" aria-hidden="true">{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= lit ? "on" : ""} />)}</span>
                  {t.vitality}/100
                </span>
                {!t.direct && <span>indirect dependency</span>}
              </p>

              {t.causeOfDeath && (
                <section className="mt-8" aria-labelledby="cod">
                  <h3 id="cod" className="t-label text-ember">Cause of death</h3>
                  <p className="t-pull mt-3 wrap-any" style={{ fontSize: 20 }}>{t.causeOfDeath.text.replace(/^Cause of death: /, "")}</p>
                </section>
              )}

              {result && (
                <section className="mt-8" aria-labelledby="res">
                  <h3 id="res" className="t-label text-ember">Resurrection</h3>
                  <div className="mt-3">{t.recipeId && <ResultView r={result} recipeId={t.recipeId} crypt={isCrypt(repo)} />}</div>
                </section>
              )}

              <section className="mt-8" aria-labelledby="evi">
                <h3 id="evi" className="t-label text-moon">Evidence</h3>
                <div className="mt-3"><EvidenceTable rows={table} /></div>
              </section>

              {successor && (
                <section className="successor mt-8" aria-labelledby="suc">
                  <h3 id="suc" className="t-label text-ember">Successor</h3>
                  <p className="mt-2 font-display wrap-any" style={{ fontSize: 22 }}>{successor.claim}</p>
                  <p className="mt-3 flex flex-wrap gap-2">{successor.chips.map((c, i) => <span key={i} className="chip"><b>{c.label}</b><span>{c.field}</span></span>)}</p>
                </section>
              )}

              {t.status !== "living" && !t.recipeId && (
                <p className="mt-8 text-[15px] text-mist">
                  <span className="t-label text-moon">No curated recipe yet.</span>{" "}
                  {t.successor ? `Suggested successor: ${t.successor.name}. ` : ""}Revenant ships tested migrations for moment, request and uuid@3 only, and will not guess at the rest.
                </p>
              )}

              {t.repository?.startsWith("https://") && (
                <p className="mt-6 text-[15px] text-mist">
                  Repository: <a className="text-moon underline underline-offset-4" href={t.repository} target="_blank" rel="noreferrer">{t.repository.replace("https://", "")}</a>
                </p>
              )}
            </div>

            <div className="drawer-foot">
              {t.status !== "living" && t.recipeId && (
                <button type="button" className="btn-ember" onPointerEnter={preload} onFocus={preload} onClick={() => setStage(true)}>
                  {result ? `Replay the resurrection of ${t.name}` : `Resurrect ${t.name}`}
                </button>
              )}
              <button type="button" className="btn-ghost" onClick={copy}>{copied ? "Copied" : "Copy evidence as JSON"}</button>
            </div>
          </>
        )}
      </dialog>
      {t && stage && t.recipeId && (
        <ResurrectSequence
          key={t.name}
          t={t}
          recipeId={t.recipeId}
          repo={repo}
          sample={sample}
          evidence={evidenceLines}
          cached={result}
          reduce={reduce}
          onResult={onResult}
          onClose={() => setStage(false)}
        />
      )}
    </>
  );
}
