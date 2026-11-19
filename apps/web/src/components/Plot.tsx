import type { Tombstone } from "@revenant/engine";

const LABEL = { dead: "Dead", dying: "Dying", living: "Alive" } as const;

function Stone({ status }: { status: Tombstone["status"] }) {
  const dying = status === "dying";
  return (
    <svg viewBox="0 0 160 210" className="absolute inset-0 h-full w-full" aria-hidden="true" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`st-${status}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={dying ? "#a9b79c" : "#c4c7d1"} />
          <stop offset="100%" stopColor={dying ? "#5c6a54" : "#5b6070"} />
        </linearGradient>
      </defs>
      <path d="M14 210 V72 Q14 12 80 12 Q146 12 146 72 V210 Z" fill={`url(#st-${status})`} stroke="#c9d3ee" strokeOpacity="0.28" strokeWidth="1.5" />
      <path d="M26 210 V74 Q26 26 80 26 Q134 26 134 74 V210" fill="none" stroke="#000" strokeOpacity="0.22" strokeWidth="2" />
      {dying && <path d="M138 74 l-6 18 l8 10 l-8 20" fill="none" stroke="#10150f" strokeOpacity="0.55" strokeWidth="2" />}
      {status === "dead" && <path d="M20 120 l8 14 l-6 10 M136 150 l-8 12 l6 14" fill="none" stroke="#10131c" strokeOpacity="0.45" strokeWidth="1.5" />}
      <path d="M8 210 q18 -16 36 0 q18 -12 36 0 q18 -16 36 0 q18 -10 36 0 V216 H8Z" fill="#0b1020" />
    </svg>
  );
}

function Lantern() {
  return (
    <svg viewBox="0 0 160 210" className="absolute inset-0 h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMax meet">
      <defs>
        <radialGradient id="lg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd37a" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#ffd37a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="80" cy="84" r="62" fill="url(#lg)" className="flicker" />
      <path d="M80 210 V120 M80 150 l-26 -22 M80 138 l28 -24 M80 120 l-6 -18 M80 120 l10 -16" stroke="#3f5a3a" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M62 70 h36 l-4 -14 h-28z" fill="#2b3342" />
      <rect x="64" y="70" width="32" height="34" rx="4" fill="#ffd37a" fillOpacity="0.9" className="flicker" />
      <path d="M72 56 q8 -14 16 0" stroke="#2b3342" strokeWidth="3" fill="none" />
      <circle cx="54" cy="128" r="5" fill="#6fb36a" />
      <circle cx="108" cy="114" r="5" fill="#6fb36a" />
      <circle cx="74" cy="102" r="4" fill="#6fb36a" />
    </svg>
  );
}

export function Plot({ t, index, onOpen }: { t: Tombstone; index: number; onOpen: (t: Tombstone) => void }) {
  const alive = t.status === "living";
  const first = t.epitaphs[0]?.text ?? "";
  return (
    <button
      type="button"
      className="plot rise"
      data-status={t.status}
      style={{ ["--i" as string]: Math.min(index, 24) }}
      onClick={() => onOpen(t)}
      aria-label={`${t.name}, ${LABEL[t.status]}. ${first}. Open details.`}
    >
      <div className="relative mx-auto aspect-[160/210] w-full max-w-[190px]">
        {alive ? <Lantern /> : <Stone status={t.status} />}
        <div className={`absolute inset-0 flex flex-col items-center overflow-hidden px-[17%] ${alive ? "justify-end pb-[3%]" : "pt-[26%]"}`}>
          {!alive && <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/70">{LABEL[t.status]}</span>}
          <span className={`mt-1 max-w-full [overflow-wrap:anywhere] font-display text-[clamp(0.85rem,2.4vw,1.15rem)] font-semibold leading-tight ${alive ? "text-bone" : "text-ink"}`}>{t.name}</span>
          <span className={`mt-1 font-mono text-[10px] ${alive ? "text-lantern" : "text-ink/75"}`}>{t.version ?? t.requested}</span>
          {!alive && <span className="mt-2 line-clamp-4 max-w-full [overflow-wrap:anywhere] text-[10.5px] leading-snug text-ink/85">{first}</span>}
          {!t.direct && <span className="mt-1 rounded-full border border-ink/40 px-1.5 font-mono text-[9px] uppercase text-ink/70">transitive</span>}
        </div>
      </div>
      {alive && <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-lantern">{LABEL[t.status]}</span>}
    </button>
  );
}
