"use client";

import type { Tombstone } from "@revenant/engine";
import { clampAtClause, clampAtWord, displayEpitaph, sourceChips, STATUS_WORD } from "@/lib/ledger";
import { Glyph } from "./Glyph";
import { StoneArt } from "./StoneArt";

const ARIA = (t: Tombstone) => `${t.name} ${t.version ?? t.requested}, ${STATUS_WORD[t.status]}. ${clampAtWord(displayEpitaph(t.epitaphs[0]), 160)} Open the evidence.`;

function Chips({ t, max }: { t: Tombstone; max: number }) {
  const { chips, more } = sourceChips(t, max);
  return (
    <>
      {chips.map((c) => (
        <span key={`${c.source}|${c.field}`} className="chip">
          <b>{c.label}</b>
          <span>{c.field.split(/(?=[.[])/).map((part, i) => (<span key={i}>{i > 0 && <wbr />}{part}</span>))}</span>
        </span>
      ))}
      {more > 0 && <span className="chip"><b>+{more}</b></span>}
    </>
  );
}

const candle = (e: React.PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--lx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--ly", `${e.clientY - r.top}px`);
};

/** A carved stone for a dead or dying package. One button: the whole stone opens the evidence. Text is real HTML over the SVG. */
export function Stone({ t, index, onOpen, hero = false }: { t: Tombstone; index: number; onOpen: (t: Tombstone, el: HTMLElement) => void; hero?: boolean }) {
  const text = displayEpitaph(t.epitaphs[0]);
  const shown = hero ? clampAtClause(text, 56) : clampAtWord(text, 90);
  const status = t.status === "dying" ? "dying" : "dead";
  return (
    <li className="tombrise" style={{ ["--i" as string]: index }}>
      <button type="button" className={hero ? "stone stone-hero" : "stone"} data-status={status} aria-label={ARIA(t)} onClick={(e) => onOpen(t, e.currentTarget)} onPointerMove={candle}>
        <StoneArt status={status} />
        <span className="stone-status">
          <span className="t-label" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Glyph status={t.status} />
            {STATUS_WORD[t.status]}
            {!t.direct && <span style={{ opacity: 0.8 }}>· indirect</span>}
          </span>
          <span className="t-evidence">{t.version ?? t.requested}</span>
        </span>
        <span className="t-title carved wrap-any" style={{ display: "block", marginTop: 8 }}>{t.name}</span>
        <span className="epi carved">{shown}</span>
        {shown !== text.trim() && <span className="more">more in the evidence</span>}
        <span className="chips"><Chips t={t} max={hero ? 1 : 2} /></span>
      </button>
    </li>
  );
}

/** Hero variant: the same stone, smaller type, epitaph cut at a clause. */
export function HeroStone(props: { t: Tombstone; index: number; onOpen: (t: Tombstone, el: HTMLElement) => void }) {
  return <Stone {...props} hero />;
}
