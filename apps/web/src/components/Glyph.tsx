import type { Tombstone } from "@revenant/engine";

/** Status shape that is never colour alone: cross = dead, half circle = dying, open circle = alive. Original SVG. */
export function Glyph({ status, size = 14 }: { status: Tombstone["status"]; size?: number }) {
  return (
    <svg className="glyph" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {status === "dead" && <path d="M8 1v14M3 5.5h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />}
      {status === "dying" && (
        <>
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor" />
        </>
      )}
      {status === "living" && <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2" />}
    </svg>
  );
}

export function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false" className="glyph">
      <path d="M4.5 2H2v8h8V7.5M7 2h3v3M10 2 5.5 6.5" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    </svg>
  );
}
