import Link from "next/link";
import SourceTag from "@/components/SourceTag";
import { getPlayerGames, getRosters, playerMap } from "@/lib/data";
import { FORMATION, MIN_GAME_SHARE, PROVISIONAL_SLOTS, REGULAR_GAME_SHARE, SLOTS, provisionalLineup, startingLineup } from "@/lib/lineup";
import { MAX_FIELDS, formatStat, stat } from "@/lib/stats";
import type { Team } from "@/lib/types";
import LineupField from "./LineupField";
import type { FieldPlayer } from "./types";

const POSITION_LABELS: Record<string, string> = {
  QB: "Quarterback", RB: "Running Back", WR: "Wide Receiver", TE: "Tight End", OL: "Offensive Line",
  DL: "Defensive Line", LB: "Linebacker", DB: "Defensive Back", REC: "Receiver (WR/TE)", DEF: "Defense",
};
/** Gruppen, die sich den elften Offense-Platz teilen */
const FLEX_COUNT: Record<string, string> = { RB: "1–2", WR: "2–3", REC: "3–4" };
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
  const colors = team.colors?.primary ? { primary: team.colors.primary, secondary: team.colors.secondary ?? "#f5c63c" } : NEUTRAL;
  const players: FieldPlayer[] = [...lineup.offense.map((p) => ({ p, unit: "offense" as const })), ...lineup.defense.map((p) => ({ p, unit: "defense" as const }))].map(({ p, unit }) => {
    const [x, z] = FORMATION[p.spot[0]][p.spot[1]] ?? [0, 0];
    const def = slots.find((s) => s.position === p.position)!;
    return {
      slot: p.slot, position: p.position, positionLabel: POSITION_LABELS[p.position] ?? p.position, unit,
      id: p.player, name: p.player ? (names.get(p.player)?.name ?? p.rosterName) : null, number: p.number, games: p.games,
      stats: p.player ? def.show.map((key) => ({ label: stat(key).abbr, value: formatStat(stat(key), p.stats[key] ?? 0) })) : [],
      down: p.spot[0] === "OL" || p.spot[0] === "DL",
      x, z,
    };
  });
  const open = players.filter((p) => !p.id).length;

  return (
    <section className="mb-12" aria-labelledby="lineup-h">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-[78ch]">
          <h2 id="lineup-h" className="display text-[28px] font-bold leading-none tracking-tight text-ink">Starting Lineup {season}</h2>
          <p className="mt-2 text-[13.5px] text-ink-2">
            {provisional ? (
              <>Vorläufig, nur aus den Statistikbögen ermittelt: Für dieses Team ist noch kein offizieller Kader hinterlegt, deshalb fehlen Rückennummern und genaue Positionen.</>
            ) : (
              <>
                Automatisch aus den Statistikbögen ermittelt: Positionen und Rückennummern aus dem{" "}
                <a href={roster!.source} className="text-accent-text underline-offset-4 hover:underline" rel="noopener">offiziellen Kader</a>, Auswahl nach Einsätzen und Produktion.
              </>
            )}
            {open > 0 && <> {open} Plätze bleiben frei, weil die Daten dort keinen Starter belegen.</>}
          </p>
        </div>
        <SourceTag kind="model" detail={provisional ? "Vorläufige Auswahl nach abgeleiteter Rolle, Einsatzschwelle und Produktion; ohne Kader" : "Auswahl nach Einsatzschwelle, Mindestvolumen und Produktion je Positionsgruppe"} />
      </div>
      <LineupField players={players} colors={colors} teamGames={lineup.teamGames} logo={team.logo} provisional={provisional} />
      <details className="mt-4 rounded-xl border border-line bg-surface px-4 py-3 text-[13px] text-ink-2">
        <summary className="cursor-pointer text-ink">So wird die Aufstellung ermittelt</summary>
        <div className="mt-3 flex max-w-[86ch] flex-col gap-2">
          <p>
            Die Quelle enthält keine Snaps und keine Starter-Angaben. Als Starter gilt, wer in mindestens {Math.round(MIN_GAME_SHARE * 100)} % der {lineup.teamGames} Teamspiele im
            Statistikbogen steht (hier {lineup.minGames} Spiele), das Mindestvolumen seiner Gruppe erreicht und dort die höchste Produktion hat. Wer in mindestens{" "}
            {Math.round(REGULAR_GAME_SHARE * 100)} % der Spiele eingesetzt wurde, darf einen freien Platz auch unter dem Mindestvolumen besetzen.
          </p>
          <ul className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
            {slots.map((s) => (
              <li key={s.position}>
                <span className="font-medium text-ink">{FLEX_COUNT[s.position] ?? s.count} × {POSITION_LABELS[s.position]}:</span> {s.basis}; {s.minLabel}
              </li>
            ))}
          </ul>
          <p>
            <span className="font-medium text-ink">Elf Offense-Plätze:</span> Neben Quarterback, einem Running Back, {provisional ? "drei Receivern" : "zwei Wide Receivern, Tight End"} und
            fünf Linemen bleibt ein Platz, der an den zweiten Running Back oder {provisional ? "den vierten Receiver" : "den dritten Wide Receiver"} geht. Wer das Mindestvolumen seiner
            Gruppe erreicht, hat Vorrang; sonst entscheiden die Yards from Scrimmage (Rushing + Receiving). Hier: {lineup.flex.winner}, {lineup.flex.reason}.
          </p>
          {provisional && (
            <p>
              Ohne Kader kennt die Seite nur die aus der Statistik abgeleitete Rolle (Quarterback, Running Back, Receiver, Defense). Receiver sind deshalb nicht in Wide Receiver und
              Tight End getrennt, und die elf Verteidiger tragen alle die Bezeichnung „DEF“. Ihre Anordnung auf dem Feld folgt dem Statistikprofil (viele Sacks und Tackles for Loss
              vorn, viele Interceptions und abgewehrte Pässe hinten) und ist keine Positionsangabe.
            </p>
          )}
          <p>
            Die Grundformation und die Anordnung auf dem Feld sind schematisch und keine Aussage über das Spielsystem. Für die Offensive Line gibt es keine Leistungswerte; ein Platz
            wird nur besetzt, wenn Einsätze im Statistikbogen belegt sind.{" "}
            {team.colors?.primary ? "Trikotfarben sind die Markenfarben des Vereins, kein Abbild des echten Trikots." : "Das Trikot ist neutral gehalten, weil für dieses Team noch keine belegten Vereinsfarben hinterlegt sind."}{" "}
            <Link href="/methodik/" className="text-accent-text underline-offset-4 hover:underline">Methodik</Link>
          </p>
          {roster?.note && <p className="text-ink-3">Hinweis zum Kader: {roster.note}</p>}
        </div>
      </details>
    </section>
  );
}
