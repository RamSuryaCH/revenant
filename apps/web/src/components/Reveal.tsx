"use client";

import { useEffect, useRef } from "react";

/** Arms a scroll reveal once, on the client. Without JS, or with reduced motion, the content is simply visible. */
export function Reveal({ children, className = "", index = 0 }: { children: React.ReactNode; className?: string; index?: number }) {
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.dataset["armed"] = "1";
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.dataset["in"] = "1";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <li ref={ref} className={`beat ${className}`} style={{ ["--i" as string]: index }}>
      {children}
    </li>
  );
}
