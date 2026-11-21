import type { Metadata, Viewport } from "next";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
// Barlow Condensed bleibt fuer die Trap View (eigene Inszenierung, src/trapview/ui/styles.css).
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./globals.css";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { langInitScript } from "@/i18n/config";
import { I18nReady, T } from "@/i18n/react";
import { FAVORITE_STYLE_ID, favoriteInitScript, type FavoriteColors } from "@/lib/favorite";
import { getTeams } from "@/lib/data";
import { teamAccent } from "@/lib/teamColors";

export const metadata: Metadata = {
  title: { default: "GFL Analytics", template: "%s · GFL Analytics" },
  description: "Statistiken, Spielerprofile und Analysewerkzeuge zur German Football League.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

// Setzt das gespeicherte Design vor dem ersten Zeichnen (kein Aufblitzen). Ohne gespeicherte Wahl: hell.
const themeScript = `try{var t=localStorage.getItem("gfl-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

/** Markierungsfarbe fürs Lieblingsteam je Design – aus den Teamfarben (curation/teams.json), lesbar auf dem jeweiligen Hintergrund. */
function favoriteColors(): FavoriteColors {
  const out: FavoriteColors = {};
  for (const t of getTeams()) {
    if (t.colors?.primary) out[t.id] = [teamAccent(t.colors, "#0b1220", 2.6), teamAccent(t.colors, "#ffffff", 2.6)];
  }
  return out;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" data-theme="light" suppressHydrationWarning>
      <head>
        {/* Leer ausgeliefert; das Skript darunter fuellt es mit den Regeln fuers Lieblingsteam (lib/favorite.ts). */}
        <style id={FAVORITE_STYLE_ID} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: "" }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript + langInitScript + favoriteInitScript(favoriteColors()) }} />
      </head>
      <body className="min-h-screen">
        <a href="#inhalt" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-1.5 focus:text-accent-ink">
          <T k="shell.skipToContent" />
        </a>
        <I18nReady />
        <SiteHeader />
        <div id="inhalt">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
