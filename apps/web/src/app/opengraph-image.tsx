import { ImageResponse } from "next/og";
import { HERO_STONES } from "@/data/hero-sample";
import { clampAtClause, displayEpitaph } from "@/lib/ledger";

export const alt = "Revenant: three dead npm packages as carved tombstones, each with the source of its epitaph";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BODY = "M0 380V150A150 150 0 0 1 300 150V380Z";
const INSET = "M20 374V152A130 130 0 0 1 280 152V374";

/** Share card drawn from the same three hero stones as the page. Original art; default font of the renderer. */
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#07080c", color: "#ede6d3", padding: 56, position: "relative" }}>
        <div style={{ display: "flex", flexDirection: "column", width: 470, justifyContent: "center" }}>
          <div style={{ fontSize: 22, letterSpacing: 3, color: "#9db4ff", textTransform: "uppercase" }}>Kiroween 2026 / Resurrection</div>
          <div style={{ fontSize: 68, lineHeight: 1.02, marginTop: 20, fontWeight: 600 }}>Your dependencies have a graveyard.</div>
          <div style={{ fontSize: 26, color: "#a9b0c0", marginTop: 24, lineHeight: 1.35 }}>Every epitaph cites its source. One click raises a spec, a patch and a pull request.</div>
          <div style={{ fontSize: 30, color: "#ff8a4c", marginTop: 28, fontWeight: 600 }}>Revenant</div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "flex-end", justifyContent: "flex-end", gap: 16 }}>
          {HERO_STONES.slice(0, 3).map((t, i) => (
            <div key={t.name} style={{ display: "flex", position: "relative", width: 176, height: 380, marginBottom: i === 1 ? 0 : i === 0 ? 24 : 44 }}>
              <svg width="176" height="380" viewBox="0 0 300 380" style={{ position: "absolute", left: 0, top: 0 }}>
                <defs>
                  <linearGradient id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={t.status === "dying" ? "#d9c27a" : "#c9cedb"} />
                    <stop offset="1" stopColor={t.status === "dying" ? "#a69447" : "#a6adbe"} />
                  </linearGradient>
                  <linearGradient id={`r${i}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
                    <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.05" />
                    <stop offset="1" stopColor="#000000" stopOpacity="0.45" />
                  </linearGradient>
                </defs>
                <path d={BODY} fill={`url(#g${i})`} />
                <path d={INSET} fill="none" stroke="#0b0e16" strokeOpacity="0.25" strokeWidth="3" />
                <path d={BODY} fill="none" stroke={`url(#r${i})`} strokeWidth="6" />
              </svg>
              <div style={{ position: "relative", display: "flex", flexDirection: "column", padding: "104px 18px 0", color: "#0b0e16", width: 176 }}>
                <div style={{ fontSize: 16, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>{t.status === "dying" ? "Dying" : "Dead"}</div>
                <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{t.name}</div>
                <div style={{ fontSize: 15, marginTop: 4 }}>{t.version ?? t.requested}</div>
                <div style={{ fontSize: 16, lineHeight: 1.3, marginTop: 10 }}>{clampAtClause(displayEpitaph(t.epitaphs[0]), 40)}</div>
                <div style={{ fontSize: 12, marginTop: 12, fontFamily: "monospace" }}>{`npm registry · ${t.epitaphs[0]?.evidence[0]?.field.split(".").slice(-1)[0] ?? ""}`}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
