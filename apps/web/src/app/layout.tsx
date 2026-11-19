import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// OFL 1.1 fonts, self-hosted by next/font at build time.
const display = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz"], display: "swap", adjustFontFallback: true });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jb", display: "swap", weight: ["400", "500"], preload: false });

export const metadata: Metadata = {
  title: "Revenant: resurrect the packages your project buried",
  description: "Map a repository's npm dependencies as a graveyard. Every epitaph cites its source field. Resurrect moment, request and uuid@3 with a Kiro spec, a patch and property-tested proof.",
  openGraph: { title: "Revenant", description: "Your dependencies have a graveyard. Every epitaph cites its source.", type: "website" },
};

export const viewport: Viewport = { themeColor: "#07080c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
