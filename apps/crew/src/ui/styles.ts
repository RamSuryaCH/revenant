/** Scoped CSS: the Revenant night-graveyard palette, nothing leaks outside .gw. */
export const CSS = `
.gw{--ink:#06080f;--ink2:#0b1020;--ink3:#131a2e;--bone:#ece6d6;--dim:#a9a79c;--moon:#a8bde0;--ember:#ff8a4c;--ember2:#d9541e;--stone:#cfc8b6;--moss:#9fb58a;--lantern:#ffd37a;
  color:var(--bone);font-family:Inter,system-ui,sans-serif;background:radial-gradient(1200px 500px at 85% -10%,rgba(168,189,224,.12),transparent 60%),var(--ink);
  border-radius:14px;padding:22px;position:relative;overflow:hidden}
.gw *{box-sizing:border-box}
.gw h2,.gw h3{font-family:Fraunces,"Iowan Old Style",Georgia,serif;font-weight:500;margin:0;letter-spacing:.2px}
.gw .mono{font-family:"JetBrains Mono",ui-monospace,Menlo,monospace}
.gw .fog{position:absolute;inset:auto -20% 0 -20%;height:140px;background:radial-gradient(60% 100% at 50% 100%,rgba(168,189,224,.10),transparent);animation:gwfog 70s linear infinite alternate;pointer-events:none}
@keyframes gwfog{to{transform:translateX(8%)}}
.gw .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:18px;position:relative}
.gw .stat{background:var(--ink2);border:1px solid #1d2742;border-radius:12px;padding:14px}
.gw .stat b{display:block;font:500 28px Fraunces,Georgia,serif}
.gw .stat span{font-size:12px;color:var(--dim);text-transform:uppercase;letter-spacing:.08em}
.gw .stat.hot{border-color:var(--ember);box-shadow:0 0 24px rgba(255,138,76,.18)}
.gw .stat.hot b{color:var(--ember)}
.gw .bar{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap;position:relative}
.gw input{flex:1;min-width:220px;background:var(--ink2);border:1px solid #243052;color:var(--bone);border-radius:10px;padding:10px 12px;font:14px "JetBrains Mono",ui-monospace,monospace}
.gw input:focus-visible,.gw button:focus-visible{outline:2px solid var(--moon);outline-offset:2px}
.gw button{cursor:pointer;border-radius:10px;border:1px solid #2c3a63;background:var(--ink3);color:var(--bone);padding:9px 14px;font:500 14px Inter,system-ui,sans-serif}
.gw button:hover{border-color:var(--moon)}
.gw button.ember{background:linear-gradient(180deg,var(--ember),var(--ember2));border-color:var(--ember);color:#1a0b04;font-weight:600}
.gw button:disabled{opacity:.55;cursor:default}
.gw .alert{border:1px solid var(--ember);background:linear-gradient(90deg,rgba(255,138,76,.14),transparent);border-radius:12px;padding:14px 16px;margin-bottom:18px;position:relative}
.gw .alert ul{margin:8px 0 0;padding:0;list-style:none;display:grid;gap:6px}
.gw .repo{background:var(--ink2);border:1px solid #1d2742;border-radius:14px;padding:18px;margin-bottom:16px;position:relative}
.gw .repo header{display:flex;justify-content:space-between;gap:12px;align-items:baseline;flex-wrap:wrap;margin-bottom:6px}
.gw .meta{color:var(--dim);font-size:13px}
.gw .meter{height:6px;background:#18213a;border-radius:6px;overflow:hidden;margin:10px 0 14px}
.gw .meter i{display:block;height:100%;background:linear-gradient(90deg,var(--moss),var(--lantern),var(--ember))}
.gw .yard{display:flex;flex-wrap:wrap;gap:10px}
.gw .tomb{all:unset;cursor:pointer;width:96px;text-align:center;padding:4px;border-radius:10px;transition:transform .25s}
.gw .tomb:hover,.gw .tomb:focus-visible{transform:translateY(-4px)}
.gw .tomb:focus-visible{outline:2px solid var(--moon)}
.gw .tomb small{display:block;font:11px "JetBrains Mono",monospace;color:var(--dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gw .tomb em{display:block;font-style:normal;font-size:11px;color:var(--bone)}
.gw .tomb.new svg{filter:drop-shadow(0 0 8px var(--ember))}
.gw .detail{margin-top:14px;border-top:1px solid #1d2742;padding-top:14px;display:grid;gap:8px}
.gw .ev{font:12px "JetBrains Mono",monospace;color:var(--moon);background:var(--ink);border-radius:8px;padding:8px 10px;overflow-wrap:anywhere}
.gw .pill{display:inline-block;border-radius:999px;border:1px solid #2c3a63;padding:1px 9px;font-size:12px;margin-right:6px}
.gw .pill.dead{color:var(--stone)}.gw .pill.dying{color:var(--lantern)}.gw .pill.living{color:var(--moss)}
.gw .err{color:#ff9f9f;font-size:13px}
.gw .empty{color:var(--dim);padding:12px 0}
@media (prefers-reduced-motion:reduce){.gw .fog{animation:none}.gw .tomb{transition:none}}
`;
