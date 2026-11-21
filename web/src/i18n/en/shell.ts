import type { Widen } from "../messages";
import type * as de from "../de/shell";

export const nav: Widen<typeof de.nav> = {
  main: "Main navigation",
  players: "Players",
  teams: "Teams",
  games: "Games",
  analytics: "Analytics",
  trapView: "Trap View",
  simulate: "Simulate",
};

export const shell: Widen<typeof de.shell> = {
  home: "GFL Analytics, home",
  skipToContent: "Skip to content",
  footerNav: "Footer",
  footerData: (from, to, stamp) => `Data: statsnscore.online, seasons ${from}–${to}, updated ${stamp}.`,
  methodLink: "Methodology and corrections",
  themeToLight: "Switch to light theme",
  themeToDark: "Switch to dark theme",
  themeLight: "Light theme",
  themeDark: "Dark theme",
  pageTitles: {
    Spieler: "Players",
    Spiele: "Games",
    Spiel: "Game",
    Rekorde: "Records",
    Spielervergleich: "Player Comparison",
    Spielersuche: "Player Search",
    "Methodik und Korrekturen": "Methodology and Corrections",
    "Breakouts und Rollen-Index": "Breakouts and Role Index",
    "Spiel simulieren": "Simulate Game",
  },
  searchLabel: "Search players or teams",
  searchPlaceholder: "Player or team",
  searchFailed: "The search index could not be loaded.",
  searchLoading: "Loading search index …",
  searchNone: (q) => `No results for “${q}”.`,
  onThisPage: "On this page",
};

export const favorite: Widen<typeof de.favorite> = {
  title: "Choose favorite team",
  current: (name) => `Favorite team: ${name}`,
  myTeam: "My team",
  yours: "Your favorite team",
  explain: "Players from your team are subtly highlighted in the team colors on every page. The choice is saved in this browser.",
  groupCurrent: "Current season",
  groupFormer: "Former GFL teams",
  chosen: "selected",
  remove: "Remove favorite team",
  badge: "Your team",
  welcomeKicker: "Welcome to GFL Analytics",
  welcomeTitle: "Who is your favorite team?",
  welcomeText:
    "Pick your team to find your way through the numbers faster: players from your team are subtly highlighted in the team colors across the whole site – you’ll spot them at a glance in tables, leaderboards and box scores.",
  teamsList: "GFL teams",
  changeLater: "You can change it anytime under “My team” in the top right.",
  skip: "Skip",
  choose: (short) => `Choose ${short}`,
  chooseTeam: "Choose team",
};
