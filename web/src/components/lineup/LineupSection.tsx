import SourceTag from "@/components/SourceTag";
import { getPlayerGames, getRosters, playerMap } from "@/lib/data";
import { FORMATION, MIN_GAME_SHARE, PROVISIONAL_SLOTS, REGULAR_GAME_SHARE, SLOTS, provisionalLineup, startingLineup } from "@/lib/lineup";
import { MAX_FIELDS } from "@/lib/stats";
import { T } from "@/i18n/react";
import LineupMethod from "./LineupMethod";
import type { Team } from "@/lib/types";
import LineupField from "./LineupField";
import type { FieldPlayer, LineupColors } from "./types";

const POSITION_LABELS: Record<string, string> = {
  QB: "Quarterback", RB: "Running Back", WR: "Wide Receiver", TE: "Tight End", OL: "Offensive Line",
  DL: "Defensive Line", LB: "Linebacker", DB: "Defensive Back", REC: "Receiver (WR/TE)", DEF: "Defense",
};
/** Neutrales Trikot, solange keine belegten Teamfarben hinterlegt sind - Farben werden nicht geraten. */
const NEUTRAL = { primary: "#dfe5ec", secondary: "#5b6b82" };

/**
 * Starting Lineup eines Teams fuer eine Saison.
 * Mit offiziellem Kader (curation/rosters.json): Positionen und Rueckennummern aus dem Kader.
 * Ohne Kader: vorlaeufige Aufstellung nur aus der Statistik (abgeleitete Rolle), ohne Nummern und ohne
 * feinere Positionen - klar als vorlaeufig gekennzeichnet. Ohne belegte Teamfarben neutrales Trikot.
 */
export default function LineupSection({ team, season }: { team: Team; season: number }) {
  const roster = getRosters()[String(season)]?.[team.id];
  const names = playerMap();
  const rows = getPlayerGames(season);
  const roleOf = (id: string) => names.get(id)?.seasons.find((s) => s.season === season)?.role;
  const lineup = roster ? startingLineup(rows, team.id, roster, MAX_FIELDS) : provisionalLineup(rows, team.id, roleOf, MAX_FIELDS);
  if (!lineup) return null;
  const provisional = lineup.basis === "provisional";
  const slots = provisional ? PROVISIONAL_SLOTS : SLOTS;
  const colors: LineupColors = team.colors?.primary
    ? { primary: team.colors.primary, secondary: team.colors.secondary ?? team.colors.primary, kit: team.colors.kit }
    : NEUTRAL;
  const players: FieldPlayer[] = [...lineup.offense.map((p) => ({ p, unit: "offense" as const })), ...lineup.defense.map((p) => ({ p, unit: "defense" as const }))].map(({ p, unit }) => {
    const [x, z] = FORMATION[p.spot[0]][p.spot[1]] ?? [0, 0];
    const def = slots.find((s) => s.position === p.position)!;
    return {
      slot: p.slot, position: p.position, positionLabel: POSITION_LABELS[p.position] ?? p.position, unit,
      id: p.player, name: p.player ? (names.get(p.player)?.name ?? p.rosterName) : p.rosterName, fill: p.fill ?? null, number: p.number, photo: p.player ? names.get(p.player)?.photo ?? null : null, games: p.games,
      stats: p.player && p.games ? def.show.map((key) => ({ key, value: p.stats[key] ?? 0 })) : [],
      spot: p.spot[0],
      down: p.spot[0] === "OL" || p.spot[0] === "DL",
      x, z,
    };
  });
  const open = players.filter((p) => !p.name).length;

  return (
    <section className="mb-12" aria-labelledby="lineup-h">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-[78ch]">
          <h2 id="lineup-h" className="display text-[34px] font-bold leading-none tracking-[-0.03em] text-ink"><T k="team.lineupTitle" a={[season]} /></h2>
          <p className="mt-2 text-[13.5px] text-ink-2">
            {provisional ? (
              <T k="team.lineupProvisional" />
            ) : (
              <>
                <T k="team.lineupRosterA" />{" "}
                <a href={roster!.source} className="text-accent-text underline-offset-4 hover:underline" rel="noopener"><T k="team.lineupRosterLink" /></a><T k="team.lineupRosterB" />
              </>
            )}
            {open > 0 && <T k="team.lineupOpen" a={[open]} />}
          </p>
        </div>
        <SourceTag kind="model" detail={provisional ? "team.lineupModelProvisional" : "team.lineupModelRoster"} />
      </div>
      <LineupField players={players} colors={colors} teamGames={lineup.teamGames} logo={team.logo} provisional={provisional} />
      <LineupMethod
        provisional={provisional}
        slots={slots.map((s) => ({ position: s.position, count: s.count }))}
        minShare={MIN_GAME_SHARE}
        regularShare={REGULAR_GAME_SHARE}
        teamGames={lineup.teamGames}
        minGames={lineup.minGames}
        flex={lineup.flex}
        hasColors={!!team.colors?.primary}
        rosterNote={roster?.note ?? null}
      />
    </section>
  );
}
