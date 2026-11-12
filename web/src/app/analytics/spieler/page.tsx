import Link from "next/link";
import ForwardWithQuery from "@/components/ForwardWithQuery";

export const metadata = { title: "Spielersuche" };

const ADD = { erweitert: "1" };

/** Fruehere Adresse der Advanced Player Search. Die Suche lebt jetzt auf /spieler/; geteilte Links werden samt Bedingungen weitergeleitet. */
export default function Page() {
  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-10 sm:px-6">
      <ForwardWithQuery to="/spieler/" add={ADD} />
      <h1 className="display text-[40px] font-bold leading-none tracking-tight text-ink">Spielersuche</h1>
      <p className="mt-3 max-w-[70ch] text-[14px] text-ink-2">
        Die erweiterte Spielersuche ist jetzt Teil der Spielerseite. Du wirst weitergeleitet; falls nicht:{" "}
        <Link href="/spieler/?erweitert=1" className="text-accent-text underline-offset-4 hover:underline">
          zur Statistiksuche auf der Spielerseite
        </Link>
        .
      </p>
    </main>
  );
}
