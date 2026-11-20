/**
 * Hinweis, wenn für die aktuelle Saison keine Daten vorliegen: Die Seite zeigt dann die jüngste vorhandene
 * Saison – ausdrücklich gekennzeichnet, nie als Werte der aktuellen Saison ausgegeben.
 */
export default function SeasonNotice({ current, latest, subject }: { current: number; latest: number; subject: "player" | "team" }) {
  if (latest >= current) return null;
  return (
    <p role="note" className="mb-6 flex flex-wrap items-baseline gap-x-2 rounded-lg border border-line bg-surface px-4 py-3 text-[13.5px] text-ink-2">
      <b className="font-semibold text-ink">Keine Daten für {current}.</b>
      <span>
        {subject === "player"
          ? `In der Saison ${current} ist kein Einsatz erfasst. Alle Werte stammen aus früheren Saisons – zuletzt ${latest} – und sind mit ihrer Saison gekennzeichnet.`
          : `Das Team ist in der Saison ${current} nicht in den GFL-Daten. Gezeigt wird zuerst ${latest}; alle Werte sind mit ihrer Saison gekennzeichnet.`}
      </span>
    </p>
  );
}
