import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz"], display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jb", display: "swap" });

export const metadata: Metadata = {
  title: "Revenant: resurrect the packages your project buried",
  description: "Map a repository's npm dependencies as a graveyard. Every epitaph cites its source. Resurrect moment, request and uuid@3 with a Kiro spec, a patch and property-tested proof.",
  openGraph: { title: "Revenant", description: "Resurrect the open-source packages your project buried.", type: "website" },
};

export const viewport: Viewport = { themeColor: "#06080f", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
