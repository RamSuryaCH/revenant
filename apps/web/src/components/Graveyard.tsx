"use client";

import { useMemo, useState } from "react";
import type { Tombstone } from "@revenant/engine";
import { summaryLine } from "@/lib/ledger";
import { Glyph } from "./Glyph";
import { Stone } from "./Stone";

type Filter = "all" | "dead" | "dying" | "living";
type Phase = "idle" | "loading" | "streaming" | "ready";

const ORDER = { dead: 0, dying: 1, living: 2 } as const;
const SOURCES = [
  { id: "npm", label: "npm registry", href: "https://registry.npmjs.org" },
  { id: "deps.dev", label: "deps.dev", href: "https://deps.dev" },
  { id: "osv", label: "OSV", href: "https://osv.dev" },
  { id: "scorecard", label: "OpenSSF Scorecard", href: "https://scorecard.dev" },
  { id: "github", label: "GitHub", href: "https://github.com" },
] as const;

const cited = (t: Tombstone): Set<string> => {
  const s = new Set<string>();
  for (const e of t.epitaphs) for (const x of e.evidence) s.add(x.source);
  for (const x of t.causeOfDeath?.evidence ?? []) s.add(x.source);
  for (const x of t.successor?.evidence ?? []) s.add(x.source);
  return s;
};

function SourceLedger({ tombs, phase }: { tombs: Tombstone[]; phase: Phase }) {
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of tombs) for (const s of cited(t)) c[s] = (c[s] ?? 0) + 1;
    return c;
  }, [tombs]);
  return (
    <div className="mt-6 rounded-2xl border border-rule bg-surface p-4">
      <p className="t-label text-dim">Source ledger</p>
      <ul className="src-ledger mt-3">
        {SOURCES.map((s) => {
          const n = counts[s.id] ?? 0;
          const state = n > 0 ? "done" : phase === "ready" ? "checked, nothing to cite" : "reading";
          return (
            <li key={s.id}>
              <span style={{ minWidth: 150, color: "var(--color-bone)" }}>{s.label}</span>
              <span className={state === "reading" ? "dots" : ""} style={{ color: n > 0 ? "var(--color-alive)" : "var(--color-mist)" }}>
                {state}
              </span>
              {n > 0 && <span className="text-dim">{n} {n === 1 ? "package" : "packages"}</span>}
            </li>
          );
        })}
      </ul>
      {phase === "streaming" && <div className="scanline mt-4" aria-hidden="true" />}
    </div>
  );
}

export function Graveyard(props: {
  phase: Phase;
  tombs: Tombstone[];
  notes: string[];
  banner: string | null;
  title: string;
  eyebrow: string;
  live: boolean;
  status: string;
  onOpen: (t: Tombstone, el: HTMLElement) => void;
}) {
  const { phase, tombs, notes, banner, title, eyebrow, live, status, onOpen } = props;
  const [filter, setFilter] = useState<Filter>("all");
  const [aliveOpen, setAliveOpen] = useState(false);

  const counts = useMemo(() => {
    const c = { dead: 0, dying: 0, living: 0 };
    for (const t of tombs) c[t.status]++;
    return c;
  }, [tombs]);
  const sorted = useMemo(() => [...tombs].sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.vitality - b.vitality || a.name.localeCompare(b.name)), [tombs]);
  const stones = sorted.filter((t) => t.status !== "living" && (filter === "all" || filter === t.status));
  const alive = sorted.filter((t) => t.status === "living");
  const showAlive = filter === "all" || filter === "living";
  const direct = tombs.filter((t) => t.direct);
  const score = direct.length ? Math.round((direct.filter((t) => t.status !== "living").length / direct.length) * 100) : 0;
  const slots = phase === "streaming" ? Math.max(0, 3 - stones.length) : 0;

  const FILTERS: Array<[Filter, string, number, Tombstone["status"] | null]> = [
    ["all", "All", tombs.length, null],
    ["dead", "Dead", counts.dead, "dead"],
    ["dying", "Dying", counts.dying, "dying"],
    ["living", "Alive", counts.living, "living"],
  ];

  return (
    <section id="graveyard" className="yard relative mx-auto max-w-[1280px] scroll-mt-4 px-[var(--pad)] pb-24 pt-20 lg:pt-28" aria-labelledby="yard-title">
      <div className="border-t border-rule pt-6">
        <p className="t-label text-moon">{eyebrow}</p>
        <h2 id="yard-title" className="t-display wrap-any mt-3">{title || "The graveyard"}</h2>
        <p className="t-pull mt-4 max-w-[48ch] text-bone" aria-live="polite">{phase === "streaming" ? (tombs.length ? `${tombs.length} checked so far. Digging…` : "Digging…") : tombs.length ? summaryLine(tombs) : ""}</p>
        {direct.length > 0 && (
          <p className="mt-2 max-w-[60ch] text-[13px] leading-relaxed text-dim">
            Graveyard score {score}%: the share of direct dependencies that are dead or dying. Lower is healthier. Old but clean packages count as alive.
          </p>
        )}
      </div>

      {banner && <p role="status" className="mt-6 rounded-xl border border-moon/30 bg-moon/10 px-4 py-3 text-[15px]">{banner}</p>}
      {notes.map((n, i) => <p key={i} className="t-evidence mt-3 text-mist">Note: {n}</p>)}
      {live && <SourceLedger tombs={tombs} phase={phase} />}

      <div role="group" aria-label="Filter by status" className="filterbar mt-8 max-w-full">
        <div className="seg">
          {FILTERS.map(([f, label, n, st]) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {st && <Glyph status={st} size={13} />}
              {label} <span className="n">{n}</span>
            </button>
          ))}
        </div>
      </div>

      {(stones.length > 0 || slots > 0) && (
        <ul className="stones mt-8" aria-label="Dead and dying packages">
          {stones.map((t, i) => <Stone key={`${t.name}@${t.version}`} t={t} index={i} onOpen={onOpen} />)}
          {Array.from({ length: slots }, (_, i) => <li key={`slot-${i}`} className="slot" aria-hidden="true" />)}
        </ul>
      )}
      {stones.length === 0 && slots === 0 && tombs.length > 0 && filter !== "living" && <p className="mt-8 text-mist">No {filter === "all" ? "dead or dying" : filter} packages in this scan.</p>}

      {showAlive && alive.length > 0 && (
        <div className="mt-12">
          <button type="button" className="alive-toggle" aria-expanded={aliveOpen || filter === "living"} aria-controls="alive-ledger" onClick={() => setAliveOpen((v) => !v)}>
            <span className="flex items-center gap-3">
              <span className="s-living"><Glyph status="living" /></span>
              <span className="font-display" style={{ fontSize: 20 }}>{alive.length} alive, checked</span>
            </span>
            <span className="text-sm text-mist">{aliveOpen || filter === "living" ? "Hide" : "Show the ledger"}</span>
          </button>
          {(aliveOpen || filter === "living") && (
            <ul id="alive-ledger" className="ledger-rows">
              {alive.map((t) => (
                <li key={`${t.name}@${t.version}`}>
                  <button type="button" className="lrow" onClick={(e) => onOpen(t, e.currentTarget)} aria-label={`${t.name} ${t.version ?? t.requested}, alive. Open the evidence.`}>
                    <span className="s-living"><Glyph status="living" /></span>
                    <span className="nm">{t.name}</span>
                    <span className="mono">{t.version ?? t.requested}</span>
                    <span className="mono when">{t.lastPublish ? `published ${t.lastPublish.slice(0, 10)}` : "no publish date"}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {phase === "streaming" && <p className="t-evidence mt-8 text-moon">{status}</p>}

      <aside className="mt-16 border-t border-rule pt-6" aria-label="About the data">
        <p className="t-label text-dim">About the data</p>
        <p className="mt-3 max-w-[70ch] text-[15px] text-mist">
          Every claim above is read from a public API field and shows that field. Sources:{" "}
          {SOURCES.map((s, i) => (
            <span key={s.id}>
              <a className="srclink text-moon underline underline-offset-4" href={s.href} target="_blank" rel="noreferrer">{s.label}</a>
              {i < SOURCES.length - 1 ? ", " : "."}
            </span>
          ))}
        </p>
      </aside>
    </section>
  );
}
