/**
 * Trap View. Broadcast-Begriffe (Player Spotlight, The Trenches, Matchups, Restart …) bleiben bewusst
 * englisch – sie sind Teil des TV-Looks. Übersetzt wird alles Erklärende.
 */
export const trapview = {
  loading: "Lade Trap View …",
  loadingData: "Lade GFL-Daten …",
  loadFailed: "Daten konnten nicht geladen werden.",
  loadHint: "Im Ordner web npm run data ausführen.",
  noTeams: "Für diese Saison liegen keine zwei Teams vor.",
  noWebgl: "Die 3D-Ansicht braucht WebGL 2, das dieser Browser oder dieses Gerät nicht bereitstellt. Aufstellung und Duelle stehen hier als Übersicht.",
  lost: "Der Browser hat die 3D-Ansicht beendet (Grafikspeicher).",
  failed: "Die 3D-Ansicht konnte nicht aufgebaut werden.",
  reload3d: "3D neu laden",
  // Auswahl
  season: "Saison",
  colorsFrom: (src: string) => `Teamfarben: ${src}`,
  colorsNone: "Keine belegten Teamfarben – neutrale Platzhalter",
  colorsNoneShort: "Farben nicht belegt",
  basisRoster: "Offizieller Kader · Nummern & Positionen",
  basisProvisional: "Vorläufig · aus Statistik, ohne Nummern",
  games: (n: number) => ` · ${n} Spiele`,
  // HUD
  seasonTag: (s: number) => `Saison ${s}`,
  provisional: "Vorläufige Aufstellung",
  provisionalHint: "Ohne offiziellen Kader: keine Rückennummern, Positionen nur grob aus der Statistik",
  eliteTag: (s: number, o: string, no: number, d: string, nd: number) =>
    `Elite-Spieler auf dem Feld (Top 10 ihrer Positionsgruppe ${s}): ${o} Offense ${no}, ${d} Defense ${nd}`,
  audioMissing: "Musikdatei fehlt oder ist nicht abspielbar",
  trenches: (ol: string, dl: string) => `Offensive Line ${ol} · Defensive Line ${dl}`,
  trenchesCount: (ol: number, olOf: number, dl: number, dlOf: number) => `Offensive Line ${ol === olOf ? ol : `${ol} von ${olOf}`} · Defensive Line ${dl === dlOf ? dl : `${dl} von ${dlOf}`}`,
  trenchesNone: "Offensive & Defensive Line · ohne Kader nicht belegbar",
  countOf: (n: number, of: number) => (n === of ? `${n}` : `${n} von ${of}`),
  // Labels
  vacant: "nicht belegt",
  lineupOf: (o: string, d: string) => `Aufstellung ${o} gegen ${d}`,
  // Elite-Übersicht
  eliteOnField: "Elite-Spieler auf dem Feld",
  eliteSub: (s: number) => `Top 10 ihrer Positionsgruppe · Saison ${s}`,
  noElite: "Kein Elite-Spieler in der Startformation",
  // Duell
  noStats: "Für diese Position enthalten die Statistikbögen keine Leistungswerte.",
  rank: (r: number) => `Rang ${r}`,
  ofLabel: (of: number, label: string) => ` von ${of} · ${label}`,
  noRank: (games: string) => `${games} · keine Liga-Einordnung`,
  matchupAria: (a: string, b: string) => `Matchup: ${a} gegen ${b}`,
  // Vergleichsfenster
  noRanking: "keine Einordnung",
  pctLabel: "Liga-Perzentil · eigene Positionsgruppe",
  h2h: "Direktes Duell",
  h2hGames: (n: number) => `${n} ${n === 1 ? "Spiel" : "Spiele"} gegeneinander`,
  sourceSummary: "Quelle & Berechnung",
  sourceText: (season: number, minGames: number, l: string, r: string) =>
    `GFL-Statistikbögen ${season}, Regular Season + Playoffs. Perzentil = Anteil der Vergleichsgruppe mit niedrigerem Wert pro Spiel (gleiche Rolle, mind. ${minGames} Spiele) – links unter ${l}, rechts unter ${r}. „Direktes Duell“: Werte aus den Spielen der beiden Teams gegeneinander, keine Deckungsdaten. Die Duelle stellen den Receiver mit den meisten Receiving Yards dem Passverteidiger mit den meisten Interceptions + abgewehrten Pässen gegenüber (usw.) – die Bögen enthalten keine Angaben, wer wen gedeckt hat.`,
  // Spotlight
  tiers: { elite: "Elite", star: "Star", key: "Schlüsselspieler" } as Record<string, string>,
  perGame: (v: string) => `${v} pro Spiel`,
  onDen: (n: string, den: string) => `bei ${n} ${den}`,
  lowGood: " · niedrig ist gut",
  pctTitle: (pct: number, peers: string) => `Perzentil ${pct} unter ${peers} der Liga`,
  top: (p: number) => `Top ${p} %`,
  opponent: "Gegenüber",
  rankText: (rank: number, of: number, peers: string) => `#${rank} von ${of} ${peers}`,
  profileSuffix: (label: string) => ` · ${label}-Profil`,
  profileScore: "Profilwert",
  profileScoreHint: "Profilwert: gewichteter Mittelwert der Liga-Perzentile (0–100)",
  cardFoot: (season: number, games: number, team: string, stand: string | null) =>
    `Saison ${season} · ${games} Spiele für ${team}${stand ? ` · Datenstand ${stand}` : ""} · Auswahl nach Liga-Perzentilen`,
  spotlightAria: (name: string, role: string, team: string) => `Player Spotlight: ${name}, ${role}, ${team}`,
  /** Statistikprofile des Spotlights (spotlight/scoring.ts), nach Profil-ID */
  profiles: {
    qb: { label: "Quarterback", peers: "Quarterbacks" },
    rb: { label: "Running Back", peers: "Running Backs" },
    rec: { label: "Receiver", peers: "Receivern (WR/TE)" },
    rusher: { label: "Pass Rusher", peers: "Verteidigern" },
    tackler: { label: "Tackler", peers: "Verteidigern" },
    coverage: { label: "Ballhawk", peers: "Verteidigern" },
  } as Record<string, { label: string; peers: string }>,
  /** Kennzahlen des Spotlights nach Metrik-ID, den = Nenner bei Quoten */
  reasons: {
    pass_yds: { label: "Passing Yards" },
    pass_td: { label: "Passing TD" },
    ypa: { label: "Yards pro Pass", den: "Passversuchen" },
    cmp_pct: { label: "Completion %", den: "Passversuchen" },
    int_rate: { label: "INT-Quote", den: "Passversuchen" },
    qb_rush_yds: { label: "Rushing Yards" },
    fum_rate: { label: "Fumbles verloren pro Ballkontakt", den: "Ballkontakten" },
    rush_yds: { label: "Rushing Yards" },
    rush_td: { label: "Rushing TD" },
    ypc: { label: "Yards pro Carry", den: "Carries" },
    rec_yds: { label: "Receiving Yards" },
    rec: { label: "Receptions" },
    rec_td: { label: "Receiving TD" },
    ypr: { label: "Yards pro Catch", den: "Catches" },
    catch_rate: { label: "Catch-Quote", den: "Targets" },
    drop_rate: { label: "Drop-Quote", den: "Targets" },
    tackles: { label: "Tackles" },
    tfl: { label: "Tackles for Loss" },
    sacks: { label: "Sacks" },
    hurries: { label: "QB Hurries" },
    ff: { label: "Forced Fumbles" },
    ints: { label: "Interceptions" },
    pbu: { label: "Abgewehrte Pässe" },
    ball: { label: "INT + abgewehrte Pässe" },
  } as Record<string, { label: string; den?: string }>,
  /** Liga-Einordnung im Duell (Kennzahlenfamilie) */
  families: {
    passing: { label: "Passing Yards pro Spiel", peers: "Quarterbacks" },
    rushing: { label: "Rushing Yards pro Spiel", peers: "Running Backs" },
    receiving: { label: "Receiving Yards pro Spiel", peers: "Receivern (WR/TE)" },
    coverage: { label: "Interceptions + abgewehrte Pässe pro Spiel", peers: "Verteidigern mit mind. 1 INT oder abgewehrtem Pass" },
    tackling: { label: "Tackles pro Spiel", peers: "Verteidigern" },
    passrush: { label: "Sacks + Tackles for Loss pro Spiel", peers: "Verteidigern mit mind. 1 Sack oder TFL" },
  } as Record<string, { label: string; peers: string }>,
  /** abgeleitete Duell-Kennzahlen (matchup/compare.ts) */
  derived: {
    cmp: { label: "Completion-Quote", abbr: "Cmp %" },
    ypc: { label: "Yards pro Lauf", abbr: "Y/Car" },
    ypr: { label: "Yards pro Catch", abbr: "Y/Rec" },
  } as Record<string, { label: string; abbr: string }>,
};
