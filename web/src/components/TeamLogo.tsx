/**
 * Offizielles Teamlogo auf einer dunklen Plakette (viele Logos sind weiss und waeren auf hellem
 * Grund unsichtbar). Ohne hinterlegte Logo-Datei erscheint das Teamkuerzel als neutraler Ersatz.
 * Logo-Pfade kommen ausschliesslich aus den zentralen Teamdaten (curation/teams.json).
 */
export interface LogoTeam {
  name: string;
  abbr: string;
  logo: string | null;
}

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function TeamLogo({ team, size = 32, className = "" }: { team: LogoTeam | undefined; size?: number; className?: string }) {
  if (!team) return null;
  const radius = Math.max(4, Math.round(size * 0.18));
  return (
    <span
      className={`logo-plate inline-grid shrink-0 place-items-center overflow-hidden ${className}`}
      style={{ width: size, height: size, borderRadius: radius }}
      title={team.name}
    >
      {team.logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- statischer Export, Bilder sind bereits klein
        <img src={`${BASE}/${team.logo}`} alt={`Logo ${team.name}`} width={size} height={size} loading="lazy" style={{ width: size * 0.82, height: size * 0.82, objectFit: "contain" }} />
      ) : (
        <span className="display font-bold text-[#e9eef5]" style={{ fontSize: Math.max(9, size * 0.32) }} aria-label={`${team.name} (kein Logo hinterlegt)`}>
          {team.abbr}
        </span>
      )}
    </span>
  );
}
