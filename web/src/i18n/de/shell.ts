/** Rahmen der Website: Navigation, Kopf- und Fußzeile, Suche, Lieblingsteam, Design. */
export const nav = {
  main: "Hauptnavigation",
  players: "Spieler",
  teams: "Teams",
  games: "Spiele",
  analytics: "Analytics",
  trapView: "Trap View",
  simulate: "Simulieren",
};

export const shell = {
  home: "GFL Analytics, Startseite",
  skipToContent: "Zum Inhalt springen",
  footerNav: "Fußzeile",
  footerData: (from: number, to: number, stamp: string) => `Daten: statsnscore.online, Saisons ${from}–${to}, Stand ${stamp}.`,
  methodLink: "Methodik und Korrekturen",
  themeToLight: "Helles Design einschalten",
  themeToDark: "Dunkles Design einschalten",
  themeLight: "Helles Design",
  themeDark: "Dunkles Design",
  /** Seitentitel im Browser-Tab (aus den Next-Metadaten): deutsch = unverändert */
  pageTitles: {} as Record<string, string>,
  searchLabel: "Spieler oder Team suchen",
  searchPlaceholder: "Spieler oder Team",
  searchFailed: "Suchindex konnte nicht geladen werden.",
  searchLoading: "Lade Suchindex …",
  searchNone: (q: string) => `Keine Treffer für „${q}“.`,
  onThisPage: "Auf dieser Seite",
};

export const favorite = {
  title: "Lieblingsteam wählen",
  current: (name: string) => `Lieblingsteam: ${name}`,
  myTeam: "Mein Team",
  yours: "Dein Lieblingsteam",
  explain: "Spieler deines Teams werden auf allen Seiten dezent in den Teamfarben markiert. Die Auswahl bleibt in diesem Browser gespeichert.",
  groupCurrent: "Aktuelle Saison",
  groupFormer: "Frühere GFL-Teams",
  chosen: "gewählt",
  remove: "Lieblingsteam entfernen",
  badge: "Dein Team",
  welcomeKicker: "Willkommen bei GFL Analytics",
  welcomeTitle: "Was ist dein Lieblingsteam?",
  welcomeText:
    "Wähle dein Team, damit du dich in den vielen Zahlen schneller zurechtfindest: Spieler deines Teams werden auf der ganzen Website dezent in den Teamfarben markiert – in Tabellen, Ranglisten und Spielberichten erkennst du sie auf einen Blick.",
  teamsList: "GFL-Teams",
  changeLater: "Jederzeit änderbar oben rechts unter „Mein Team“.",
  skip: "Überspringen",
  choose: (short: string) => `${short} auswählen`,
  chooseTeam: "Team auswählen",
};
