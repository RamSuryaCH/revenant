import { useAppApi, useChatLauncher, useNotify } from "@kirocrew/app-sdk";
import { PageHeader } from "@kirocrew/app-sdk/ui";
import { useCallback, useEffect, useState } from "react";
import type { Dep, NightlyRun, Snapshot } from "../core/types.js";
import { CSS } from "./styles.js";

const BASE = "/api/apps/graveyard-watch";
const NECROMANCER = "necromancer";

interface ApiState {
  watched: string[];
  snapshots: Record<string, Snapshot>;
  nightly: NightlyRun | null;
  scanning: string[];
  errors: Record<string, string>;
}

function Tombstone({ dep, fresh }: { dep: Dep; fresh: boolean }) {
  const dead = dep.status === "dead";
  const dying = dep.status === "dying";
  const stroke = dead ? "#cfc8b6" : dying ? "#ffd37a" : "#9fb58a";
  return (
    <svg width="64" height="76" viewBox="0 0 64 76" aria-hidden="true">
      {dep.status === "living" ? (
        <g>
          <circle cx="32" cy="34" r="16" fill="#ffd37a" opacity=".16" />
          <rect x="22" y="22" width="20" height="28" rx="4" fill="#131a2e" stroke={stroke} strokeWidth="2" />
          <circle cx="32" cy="36" r="5" fill="#ffd37a" />
          <rect x="18" y="50" width="28" height="5" rx="2" fill="#0b1020" stroke={stroke} />
        </g>
      ) : (
        <g>
          <path d="M10 70V30a22 22 0 0 1 44 0v40z" fill="#131a2e" stroke={stroke} strokeWidth="2" />
          {dead ? <path d="M32 24v22M23 33h18" stroke={fresh ? "#ff8a4c" : stroke} strokeWidth="2.5" strokeLinecap="round" /> : <path d="M30 14l5 12-6 8 5 10" fill="none" stroke={stroke} strokeWidth="2" />}
          <rect x="4" y="68" width="56" height="5" rx="2" fill="#0b1020" />
        </g>
      )}
    </svg>
  );
}

function Detail({ repo, dep, onResurrect }: { repo: string; dep: Dep; onResurrect: () => void }) {
  return (
    <div className="detail" role="region" aria-label={`Details for ${dep.name}`}>
      <div>
        <span className={`pill ${dep.status}`}>{dep.status}</span>
        <b className="mono">{dep.name}</b> <span className="meta">vitality {Math.round(dep.vitality)}/100{dep.version ? ` · ${dep.version}` : ""}</span>
      </div>
      <div>{dep.cause || "No cause recorded."}</div>
      {dep.evidence.map((e, i) => (
        <div className="ev" key={`${e.field}-${i}`}>
          {e.source} · {e.field} = {String(e.value)}
          {e.url ? <> · <a href={e.url} target="_blank" rel="noreferrer" style={{ color: "inherit" }}>source</a></> : null}
        </div>
      ))}
      {dep.successor ? <div className="meta">Successor: <b className="mono">{dep.successor}</b></div> : null}
      {dep.recipeId ? (
        <div>
          <button className="ember" onClick={onResurrect}>Resurrect with the necromancer</button>
          <span className="meta"> curated recipe: {dep.recipeId} · {repo}</span>
        </div>
      ) : (
        <div className="meta">No curated recipe for this package yet. The necromancer will not guess.</div>
      )}
    </div>
  );
}

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};

export default function GraveyardWatch() {
  const api = useAppApi();
  const notify = useNotify();
  const { openChat } = useChatLauncher();
  const [state, setState] = useState<ApiState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState<{ repo: string; name: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setState(await api.get<ApiState>(`${BASE}/state`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach the Graveyard Watch backend.");
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);
  // Poll only while something is scanning.
  const busy = (state?.scanning.length ?? 0) > 0;
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => void load(), 2000);
    return () => clearInterval(t);
  }, [busy, load]);

  const act = async (path: string, body: unknown, okMsg?: string) => {
    try {
      await api.post(`${BASE}${path}`, body);
      if (okMsg) notify(okMsg, { type: "success" });
    } catch (e) {
      notify(e instanceof Error ? e.message : "Request failed", { type: "error" });
    }
    await load();
  };

  const snaps = state ? state.watched.map((r) => state.snapshots[r]).filter((s): s is Snapshot => !!s) : [];
  const total = snaps.reduce((a, s) => a + s.summary.dead, 0);
  const fresh = snaps.flatMap((s) => s.newlyDead.map((n) => ({ repo: s.repo, name: n, dep: s.deps.find((d) => d.name === n) })));
  const last = state?.nightly;

  return (
    <>
      <PageHeader title="Graveyard Watch" subtitle="Dead dependencies in the repositories you watch, and who just joined them." />
      <div className="px-6 pb-8 overflow-y-auto flex-1 min-h-0">
        <style>{CSS}</style>
        <div className="gw">
          <div className="stats">
            <div className="stat"><b>{state?.watched.length ?? 0}</b><span>Watched repos</span></div>
            <div className="stat"><b>{total}</b><span>Dead packages</span></div>
            <div className={`stat ${fresh.length ? "hot" : ""}`}><b>{fresh.length}</b><span>Newly dead</span></div>
            <div className="stat"><b style={{ fontSize: 18 }}>{last ? ago(last.at) : "not yet"}</b><span>Last nightly run</span></div>
          </div>

          <form className="bar" onSubmit={(e) => { e.preventDefault(); if (input.trim()) { void act("/watch", { repo: input }, "Watching. Scanning now."); setInput(""); } }}>
            <input aria-label="GitHub repository" placeholder="owner/name or https://github.com/owner/name" value={input} onChange={(e) => setInput(e.target.value)} />
            <button className="ember" type="submit">Watch repo</button>
            <button type="button" disabled={busy} onClick={() => void act("/scan", {})}>{busy ? "Scanning…" : "Rescan all"}</button>
          </form>

          {error ? <p className="err" role="alert">{error}</p> : null}

          {fresh.length ? (
            <div className="alert" role="status">
              <h3>Newly dead</h3>
              <span className="meta">Not dead at the previous scan, dead now.</span>
              <ul>
                {fresh.map((f) => (
                  <li key={`${f.repo}-${f.name}`}>
                    <button onClick={() => setOpen({ repo: f.repo, name: f.name })}><span className="mono">{f.name}</span></button>{" "}
                    <span className="meta">{f.repo} · {f.dep?.cause.slice(0, 110)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {state && state.watched.length === 0 ? <p className="empty">No repositories yet. Add one above.</p> : null}
          {state?.watched.map((repo) => {
            const s = state.snapshots[repo];
            const scanning = state.scanning.includes(repo);
            const failure = state.errors[repo];
            const shown = s ? [...s.deps].sort((a, b) => a.vitality - b.vitality) : [];
            return (
              <section className="repo" key={repo} aria-label={repo}>
                <header>
                  <h3 className="mono" style={{ fontSize: 18 }}>{repo}</h3>
                  <span className="meta">
                    {scanning ? "Scanning…" : s ? `scanned ${ago(s.scannedAt)}${s.baseline ? " · baseline" : ""}` : "not scanned yet"}{" "}
                    <button disabled={scanning} onClick={() => void act("/scan", { repo })}>Rescan</button>{" "}
                    <button onClick={() => void act("/unwatch", { repo })} aria-label={`Stop watching ${repo}`}>Remove</button>
                  </span>
                </header>
                {failure ? <p className="err" role="alert">Scan failed: {failure}. Showing the previous result.</p> : null}
                {s ? (
                  <>
                    <div className="meta">
                      <span className="pill dead">{s.summary.dead} dead</span>
                      <span className="pill dying">{s.summary.dying} dying</span>
                      <span className="pill living">{s.summary.living} living</span>
                      graveyard score {Math.round(s.summary.graveyardScore)}
                    </div>
                    <div className="meter" aria-hidden="true"><i style={{ width: `${s.summary.graveyardScore}%` }} /></div>
                    <div className="yard">
                      {shown.map((d) => (
                        <button className={`tomb ${s.newlyDead.includes(d.name) ? "new" : ""}`} key={d.name} aria-label={`${d.name}, ${d.status}`} aria-expanded={open?.repo === repo && open.name === d.name} onClick={() => setOpen(open?.repo === repo && open.name === d.name ? null : { repo, name: d.name })}>
                          <Tombstone dep={d} fresh={s.newlyDead.includes(d.name)} />
                          <small>{d.name}</small>
                          <em>{d.status}</em>
                        </button>
                      ))}
                    </div>
                    {open?.repo === repo ? (() => {
                      const dep = s.deps.find((d) => d.name === open.name);
                      return dep ? (
                        <Detail repo={repo} dep={dep} onResurrect={() => openChat({ agent: NECROMANCER, message: `Resurrect ${dep.name} in ${repo} using the curated recipe ${dep.recipeId}. Use the revenant tools, show the patch, and run the differential tests before you report.` })} />
                      ) : null;
                    })() : null}
                    {s.notes.length ? <p className="meta">{s.notes.join(" ")}</p> : null}
                  </>
                ) : scanning ? null : <p className="empty">Nothing scanned yet.</p>}
              </section>
            );
          })}

          <section className="repo" aria-label="Nightly run">
            <h3 style={{ fontSize: 18 }}>Nightly run</h3>
            {last ? (
              <div className="meta">
                {new Date(last.at).toLocaleString()} · {last.scanned} repo(s) scanned · {last.newlyDead.reduce((a, n) => a + n.names.length, 0)} newly dead · demo reset {last.reset.status}
                <div>{last.reset.detail}</div>
                {last.errors.map((e) => <div className="err" key={e}>{e}</div>)}
              </div>
            ) : (
              <p className="empty">The nightly job has not run yet. It rescans every watched repo at 02:00 and resets the demo repo.</p>
            )}
          </section>
          <div className="fog" aria-hidden="true" />
        </div>
      </div>
    </>
  );
}
