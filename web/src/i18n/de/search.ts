/** Suchen, Filter, Bedingungs-Baukasten und Ergebnistabellen (Spieler-, Spiele-, Teamsuche). */
export const query = {
  stat: "Kennzahl",
  conditions: "Bedingungen",
  logic: "Verknüpfung",
  hitsMeet: "Treffer erfüllen",
  logicAnd: "alle (UND)",
  logicOr: "mindestens eine (ODER)",
  joinAnd: "UND",
  joinOr: "ODER",
  chooseStat: "Statistik wählen …",
  compare: "Vergleich",
  value: "Wert",
  upper: "Obergrenze",
  and: "und",
  remove: "Bedingung entfernen",
  add: "+ Bedingung hinzufügen",
  ops: { gte: "mindestens", lte: "höchstens", gt: "mehr als", lt: "weniger als", eq: "genau", between: "zwischen" } as Record<string, string>,
  describe: (label: string, op: string, a: number, b?: number) => (op === "between" ? `${label} zwischen ${a} und ${b ?? a}` : `${label} ${op} ${a}`),
  career: "Karriere",
  careerLabel: (label: string) => `Karriere: ${label}`,
  careerGroup: (group: string) => `Karriere · ${group}`,
  careerShort: "Karr.",
  careerTitle: "Karriere (alle Saisons): ",
  more: "Weitere",
};

export const table = {
  noHits: "Keine Treffer. Bedingungen lockern oder Filter zurücksetzen.",
  showMore: (n: number, rest: number) => `Weitere ${n} von ${rest} anzeigen`,
  sortBy: "Sortieren nach",
  notRecordedSeason: "In dieser Saison nicht erfasst",
};

export const playerSearch = {
  title: "Spieler",
  intro: (current: number, first: number) =>
    `Spieler mit Eintrag in einem Statistikbogen – standardmäßig die aktuelle Saison ${current}, frühere Saisons seit ${first} über den Saisonfilter. Nach Namen suchen, nach Saison, Team und Rolle filtern oder in der Statistiksuche eigene Bedingungen kombinieren. Rollen sind aus den Statistiken abgeleitet; die Quelle enthält keine Positionen. Jede Suche steht in der Adresse und lässt sich als Link teilen.`,
  nameLabel: "Spielername",
  namePlaceholder: "Spieler suchen, z. B. Tim Müller",
  statSearch: "Statistiksuche",
  clearConditions: "Bedingungen löschen",
  gamesShort: "Sp",
  rowsIn: (n: number, season: number | null) => (season !== null ? `${n} Spieler-Saisons in ${season}` : `${n} Spieler-Saisons aus allen Saisons`),
  playersParen: (n: number) => ` (${n} Spieler)`,
  withConds: (text: string) => ` mit ${text}`,
  elsewhere: (n: number, season: number | null) => `${n} weitere${n === 1 ? "r" : ""} Spieler ohne passenden Eintrag ${season ?? ""}, aber in anderen Saisons.`,
  showAllSeasons: "Alle Saisons anzeigen",
  caption: "Ergebnisse der Spielersuche",
  footnote: "* berechnete Kennzahl. „Karriere“ = Summe aller Saisons des Spielers. „n. e.“ = nicht erfasst; solche Werte gelten nicht als 0 und erfüllen keine Bedingung.",
  scope: "Spielphase",
};
