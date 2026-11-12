import Link from "next/link";

export const metadata = { title: "Analytics" };

const TOOLS = [
  { href: "/analytics/spieler/", title: "Advanced Player Search", text: "Saison- oder Karrierewerte mit beliebig kombinierten Bedingungen, Filter nach Team, Rolle und Spielen." },
  { href: "/analytics/spiele/", title: "Advanced Game Search", text: "Einzelleistungen in einzelnen Spielen: z. B. alle Spiele mit 200 Receiving Yards und einem Touchdown." },
  { href: "/analytics/teams/", title: "Advanced Team Search", text: "Team-Saisons nach Offense, Defense und Effizienz filtern und bis zu drei nebeneinander vergleichen." },
  { href: "/vergleich/", title: "Spielervergleich", text: "Bis zu drei Spieler-Saisons im Radar-Chart, normalisiert als Perzentil oder Anteil am Bestwert." },
  { href: "/leaders/", title: "League Leaders", text: "Rangliste für jede Kennzahl als Saison-, Einzelsaison- oder Karrierewert." },
  { href: "/analytics/breakouts/", title: "Breakouts und Rollen-Index", text: "Spieler mit dem größten Sprung zur Vorsaison und die stärksten Profile je Rolle, mit Begründung." },
  { href: "/rekorde/", title: "Rekorde", text: "Beste Einzelspiele, Saisons und Karrierewerte seit 2023." },
  { href: "/methodik/", title: "Methodik", text: "Alle Formeln, Modelle, Korrekturen und Datenlücken." },
];

export default function AnalyticsPage() {
  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-10 sm:px-6">
      <h1 className="display text-[52px] font-bold leading-none tracking-tight text-ink">Analytics</h1>
      <p className="mb-8 mt-3 max-w-[70ch] text-[14px] text-ink-2">Werkzeuge für eigene Abfragen. Jede Abfrage steht in der Adresse und lässt sich als Link speichern oder teilen.</p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TOOLS.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="flex h-full flex-col rounded-xl border border-line bg-surface px-5 py-4 hover:border-line-strong">
              <span className="display text-[20px] font-semibold text-ink">{t.title}</span>
              <span className="mt-1.5 text-[13.5px] text-ink-2">{t.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
