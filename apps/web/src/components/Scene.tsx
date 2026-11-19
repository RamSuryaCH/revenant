/** Original night-graveyard backdrop: SVG + CSS only, three parallax layers and two fog bands. */

const STARS = Array.from({ length: 46 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12345.6789;
  return { x: (a - Math.floor(a)) * 1440, y: (b - Math.floor(b)) * 380, r: 0.6 + ((i * 7) % 5) * 0.28, o: 0.35 + ((i * 3) % 6) * 0.1 };
});

export function Scene() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_70%_18%,#1a2547_0%,#0b1020_45%,#06080f_80%)]" />
      <div className="scene-layer px-1">
        <svg className="h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#dbe6ff" stopOpacity="0.55" />
              <stop offset="40%" stopColor="#a8bde0" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#a8bde0" stopOpacity="0" />
            </radialGradient>
          </defs>
          {STARS.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#dfe8ff" opacity={s.o} />
          ))}
          <circle cx="1090" cy="210" r="260" fill="url(#moonGlow)" />
          <circle cx="1090" cy="210" r="62" fill="#e9eefc" />
          <circle cx="1070" cy="196" r="10" fill="#c9d3ee" opacity="0.7" />
          <circle cx="1110" cy="232" r="14" fill="#c9d3ee" opacity="0.55" />
          <circle cx="1100" cy="186" r="6" fill="#c9d3ee" opacity="0.6" />
        </svg>
      </div>
      <div className="scene-layer px-2">
        <svg className="h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">
          <path d="M0 640 Q180 560 360 610 T700 590 T1060 620 T1440 570 V900 H0Z" fill="#0a0f1d" />
          <g fill="#070b15">
            <path d="M210 610 v-90 m0 30 l-30 -34 m30 52 l34 -40 m-34 -30 l-14 -28 m14 28 l16 -22" stroke="#070b15" strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M1180 600 v-120 m0 50 l-40 -46 m40 70 l44 -50 m-44 -60 l-18 -34 m18 34 l22 -30" stroke="#070b15" strokeWidth="6" fill="none" strokeLinecap="round" />
          </g>
        </svg>
      </div>
      <div className="fog slow" style={{ bottom: "22%" }} />
      <div className="scene-layer px-3">
        <svg className="h-full w-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMax slice">
          <path d="M0 740 Q240 690 480 730 T960 720 T1440 700 V900 H0Z" fill="#070a14" />
          <g fill="#05070d">
            <path d="M120 760 v-52 q0 -22 18 -22 q18 0 18 22 v52z" />
            <path d="M300 770 v-40 q0 -18 14 -18 q14 0 14 18 v40z" />
            <path d="M1050 765 v-60 q0 -24 20 -24 q20 0 20 24 v60z" />
            <path d="M1290 772 v-44 q0 -18 15 -18 q15 0 15 18 v44z" />
            <path d="M700 778 l0 -34 l-16 0 l0 -10 l16 0 l0 -14 l10 0 l0 14 l16 0 l0 10 l-16 0 l0 34z" />
          </g>
        </svg>
      </div>
      <div className="fog" style={{ bottom: "6%" }} />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent" />
    </div>
  );
}
