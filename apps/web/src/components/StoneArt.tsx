/** Shared gradients and filters for every carved stone. Rendered once in the layout; stones reference them by id. Original art, no raster. */
export function StoneDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="sd-dead" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9cedb" />
          <stop offset="1" stopColor="#a6adbe" />
        </linearGradient>
        <linearGradient id="sd-dying" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d9c27a" />
          <stop offset="1" stopColor="#a69447" />
        </linearGradient>
        <radialGradient id="sd-light" cx="0.28" cy="0.12" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity="0.32" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sd-rim" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="300" y2="380">
          <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="1" stopColor="#000" stopOpacity="0.45" />
        </linearGradient>
        <filter id="sd-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.12 0 0 0 0" />
          <feComposite in2="SourceAlpha" operator="in" />
        </filter>
        <filter id="sd-blur" x="-20%" y="-200%" width="140%" height="500%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
    </svg>
  );
}

const BODY = "M0 380V150A150 150 0 0 1 300 150V380Z";
const INSET = "M20 374V152A130 130 0 0 1 280 152V374";

/** The carved stone behind the text. Stretches with the card; strokes keep their width. */
export function StoneArt({ status }: { status: "dead" | "dying" }) {
  const fill = status === "dying" ? "url(#sd-dying)" : "url(#sd-dead)";
  const ne = { vectorEffect: "non-scaling-stroke" } as const;
  return (
    <svg className="stone-art" viewBox="0 0 300 380" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <ellipse cx="150" cy="380" rx="170" ry="9" fill="#000" opacity="0.55" filter="url(#sd-blur)" />
      <path d={BODY} fill={fill} />
      <path d={BODY} fill="url(#sd-light)" />
      <path d={BODY} fill="#000" filter="url(#sd-grain)" />
      <path d={INSET} fill="none" stroke="#0b0e16" strokeOpacity="0.22" strokeWidth="1.5" {...ne} />
      <path d={INSET} fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1" transform="translate(0 1.6)" {...ne} />
      {status === "dying" ? (
        <path d="M236 36 222 92 240 132 214 190 232 238 206 296" fill="none" stroke="#0b0e16" strokeOpacity="0.5" strokeWidth="1.5" strokeLinejoin="round" {...ne} />
      ) : (
        <path d="M54 318 72 284 62 252 80 226" fill="none" stroke="#0b0e16" strokeOpacity="0.28" strokeWidth="1.2" strokeLinejoin="round" {...ne} />
      )}
      <path d={BODY} fill="none" stroke="url(#sd-rim)" strokeWidth="3" {...ne} />
      <path className="rim" d={BODY} fill="none" stroke="#d9541e" strokeWidth="3" {...ne} />
    </svg>
  );
}
