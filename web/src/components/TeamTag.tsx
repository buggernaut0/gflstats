import Link from "next/link";
import type { TeamLite } from "@/lib/dashboard";

/** Kurzes Teamkuerzel; Teamfarbe nur als schmaler Streifen, sobald hinterlegt. */
export default function TeamTag({ team, link = true }: { team: TeamLite | undefined; link?: boolean }) {
  if (!team) return <span className="text-ink-3">–</span>;
  const body = (
    <span
      title={team.name}
      className="inline-flex items-center gap-1 rounded-[4px] border border-line px-1.5 py-[1px] text-[11.5px] font-semibold tracking-wide text-ink-2"
    >
      {/* Teamfarben als geteilter Streifen (oben Haupt-, unten Zweitfarbe); ohne Farben neutral, gleiche Breite */}
      <span
        className="h-2.5 w-[3px] overflow-hidden rounded-full"
        style={{
          background: team.colors?.primary
            ? `linear-gradient(${team.colors.primary} 55%, ${team.colors.secondary ?? team.colors.primary} 55%)`
            : "var(--color-line)",
          boxShadow: "0 0 0 0.5px rgb(255 255 255 / 0.18)",
        }}
        aria-hidden="true"
      />
      {team.abbr}
    </span>
  );
  return link ? (
    <Link href={`/teams/${team.id}/`} className="hover:[&>span]:border-line-strong hover:[&>span]:text-ink">
      {body}
    </Link>
  ) : (
    body
  );
}
