import type { Metadata, Viewport } from "next";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./globals.css";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { FAVORITE_STYLE_ID, favoriteInitScript } from "@/lib/favorite";

export const metadata: Metadata = {
  title: { default: "GFL Analytics", template: "%s · GFL Analytics" },
  description: "Statistiken, Spielerprofile und Analysewerkzeuge zur German Football League.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0c1420" },
    { media: "(prefers-color-scheme: light)", color: "#f3f5f8" },
  ],
};

// Setzt das gespeicherte Design vor dem ersten Zeichnen (kein Aufblitzen).
const themeScript = `try{var t=localStorage.getItem("gfl-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Leer ausgeliefert; das Skript darunter fuellt es mit den Regeln fuers Lieblingsteam (lib/favorite.ts). */}
        <style id={FAVORITE_STYLE_ID} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: "" }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript + favoriteInitScript }} />
      </head>
      <body className="min-h-screen">
        <a href="#inhalt" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-1.5 focus:text-accent-ink">
          Zum Inhalt springen
        </a>
        <SiteHeader />
        <div id="inhalt">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
