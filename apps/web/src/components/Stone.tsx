"use client";

import type { Tombstone } from "@revenant/engine";
import { clampAtWord, sourceChips, STATUS_WORD } from "@/lib/ledger";
import { Glyph } from "./Glyph";

const ARIA = (t: Tombstone) => `${t.name} ${t.version ?? t.requested}, ${STATUS_WORD[t.status]}. ${clampAtWord(t.epitaphs[0]?.text ?? "", 160)} Open the evidence.`;

function Chips({ t, max }: { t: Tombstone; max: number }) {
  const { chips, more } = sourceChips(t, max);
  return (
    <>
      {chips.map((c) => (
        <span key={`${c.source}|${c.field}`} className="chip">
          <b>{c.label}</b>
          <span>{c.field}</span>
        </span>
      ))}
      {more > 0 && <span className="chip"><b>+{more}</b></span>}
    </>
  );
}

/** Large stone card for a dead or dying package. A single button: the whole stone opens the evidence. */
export function Stone({ t, index, onOpen }: { t: Tombstone; index: number; onOpen: (t: Tombstone, el: HTMLElement) => void }) {
  const text = t.epitaphs[0]?.text ?? "";
  const clamped = clampAtWord(text, 90);
  return (
    <li className="tombrise" style={{ ["--i" as string]: Math.min(index, 6) }}>
      <button
        type="button"
        className="stone"
        data-status={t.status}
        aria-label={ARIA(t)}
        onClick={(e) => onOpen(t, e.currentTarget)}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty("--lx", `${e.clientX - r.left}px`);
          e.currentTarget.style.setProperty("--ly", `${e.clientY - r.top}px`);
        }}
      >
        {t.status === "dying" && (
          <svg className="crack" viewBox="0 0 36 120" aria-hidden="true" focusable="false">
            <path d="M30 0 22 26 30 44 16 70 24 92 12 120" fill="none" stroke="#0b0e16" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        )}
        <span className="stone-status">
          <span className="t-label" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Glyph status={t.status} />
            {STATUS_WORD[t.status]}
            {!t.direct && <span style={{ opacity: 0.8 }}>· indirect</span>}
          </span>
          <span className="t-evidence">{t.version ?? t.requested}</span>
        </span>
        <span className="t-title carved wrap-any" style={{ display: "block", marginTop: 8 }}>{t.name}</span>
        <span className="epi carved">{clamped}</span>
        {clamped !== text.trim() && <span className="more">more in the evidence</span>}
        <span className="chips"><Chips t={t} max={2} /></span>
      </button>
    </li>
  );
}

/** Row used in the hero: plaque with the carved name, the epitaph and its sources. */
export function HeroStone({ t, index, onOpen }: { t: Tombstone; index: number; onOpen: (t: Tombstone, el: HTMLElement) => void }) {
  return (
    <li className="tombrise" style={{ ["--i" as string]: index }}>
      <button type="button" className="hstone" data-status={t.status} aria-label={ARIA(t)} onClick={(e) => onOpen(t, e.currentTarget)}>
        <span className="plaque carved">
          <span className="t-label" style={{ color: "var(--color-stone-text)", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Glyph status={t.status} />
            {STATUS_WORD[t.status]}
          </span>
          <span className="t-evidence wrap-any" style={{ fontWeight: 500, color: "var(--color-stone-text)" }}>
            <span className="font-display" style={{ fontSize: 22, fontWeight: 600, display: "block", lineHeight: 1.1 }}>{t.name}</span>
            {t.version ?? t.requested}
          </span>
        </span>
        <span className="body">
          <span className="font-display wrap-any" style={{ fontSize: 17, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{clampAtWord(t.epitaphs[0]?.text ?? "", 80)}</span>
          <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}><Chips t={t} max={2} /></span>
        </span>
      </button>
    </li>
  );
}
