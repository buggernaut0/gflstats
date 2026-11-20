import type { Widen } from "../messages";
import type * as de from "../de/search";

export const query: Widen<typeof de.query> = {
  stat: "Stat",
  conditions: "Conditions",
  logic: "Logic",
  hitsMeet: "Results match",
  logicAnd: "all (AND)",
  logicOr: "at least one (OR)",
  joinAnd: "AND",
  joinOr: "OR",
  chooseStat: "Choose a stat …",
  compare: "Comparison",
  value: "Value",
  upper: "Upper limit",
  and: "and",
  remove: "Remove condition",
  add: "+ Add condition",
  ops: { gte: "at least", lte: "at most", gt: "more than", lt: "less than", eq: "exactly", between: "between" },
  describe: (label, op, a, b) => (op === "between" ? `${label} between ${a} and ${b ?? a}` : `${label} ${op} ${a}`),
  career: "Career",
  careerLabel: (label) => `Career: ${label}`,
  careerGroup: (group) => `Career · ${group}`,
  careerShort: "Car.",
  careerTitle: "Career (all seasons): ",
  more: "Other",
};

export const table: Widen<typeof de.table> = {
  noHits: "No results. Loosen the conditions or reset the filters.",
  showMore: (n, rest) => `Show ${n} more of ${rest}`,
  sortBy: "Sort by",
  notRecordedSeason: "Not recorded this season",
};

export const playerSearch: Widen<typeof de.playerSearch> = {
  title: "Players",
  intro: (current, first) =>
    `Every player with an entry in a stat sheet – the current ${current} season by default, earlier seasons since ${first} via the season filter. Search by name, filter by season, team and role, or combine your own conditions in the stat search. Roles are derived from the stats; the source contains no positions. Every search is stored in the URL and can be shared as a link.`,
  nameLabel: "Player name",
  namePlaceholder: "Search players, e.g. Tim Müller",
  statSearch: "Stat search",
  clearConditions: "Clear conditions",
  gamesShort: "G",
  rowsIn: (n, season) => (season !== null ? `${n} player seasons in ${season}` : `${n} player seasons across all seasons`),
  playersParen: (n) => ` (${n} ${n === 1 ? "player" : "players"})`,
  withConds: (text) => ` with ${text}`,
  elsewhere: (n, season) => `${n} more ${n === 1 ? "player" : "players"} with no matching entry in ${season ?? ""}, but in other seasons.`,
  showAllSeasons: "Show all seasons",
  caption: "Player search results",
  footnote: "* calculated stat. “Career” = sum of all of the player’s seasons. “n/r” = not recorded; such values do not count as 0 and never meet a condition.",
  scope: "Game phase",
};
