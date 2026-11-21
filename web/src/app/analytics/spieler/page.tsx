import Link from "next/link";
import ForwardWithQuery from "@/components/ForwardWithQuery";
import { T } from "@/i18n/react";

export const metadata = { title: "Spielersuche" };

const ADD = { erweitert: "1" };

/** Fruehere Adresse der Advanced Player Search. Die Suche lebt jetzt auf /spieler/; geteilte Links werden samt Bedingungen weitergeleitet. */
export default function Page() {
  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-24 pt-10 sm:px-8">
      <ForwardWithQuery to="/spieler/" add={ADD} />
      <h1 className="display text-[40px] font-extrabold leading-[0.98] tracking-[-0.035em] text-ink sm:text-[64px]"><T k="analytics.searches.players.title" /></h1>
      <p className="mt-3 max-w-[70ch] text-[14px] text-ink-2">
        <T k="analytics.moved" />{" "}
        <Link href="/spieler/?erweitert=1" className="text-accent-text underline-offset-4 hover:underline">
          <T k="analytics.movedLink" />
        </Link>
        .
      </p>
    </main>
  );
}
