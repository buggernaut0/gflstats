import AnalyticsCrumb from "@/components/AnalyticsCrumb";
import { BreakoutSection, RoleIndexSection } from "@/components/ModelSections";
import { toTeamLite, type TeamLite } from "@/lib/dashboard";
import { getMeta, getPlayers, getTeams } from "@/lib/data";
import { breakouts, roleIndexRows } from "@/lib/insights";
import { allEntries } from "@/lib/serverCache";
import { T } from "@/i18n/react";

export const metadata = { title: "Breakouts und Rollen-Index" };

export default function BreakoutsPage() {
  const meta = getMeta();
  const names = Object.fromEntries(getPlayers().map((p) => [p.id, p.name]));
  const teams: Record<string, TeamLite> = Object.fromEntries(getTeams().map((t) => [t.id, toTeamLite(t)]));
  const seasons = [...meta.seasons].reverse();
  return (
    <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-10 sm:px-6">
      <AnalyticsCrumb current="analytics.breakoutsPage" />
      <h1 className="display text-[48px] font-bold leading-none tracking-tight text-ink"><T k="analytics.breakoutsPage" /></h1>
      <p className="mb-10 mt-3 max-w-[74ch] text-[14px] text-ink-2">
        <T k="analytics.breakoutsPageIntro" />
      </p>
      <div className="flex flex-col gap-16">
        {seasons.map((s) => (
          <div key={s} className="flex flex-col gap-10 border-t border-line pt-10 first:border-0 first:pt-0">
            {meta.seasons.includes(s - 1) && <BreakoutSection items={breakouts(allEntries(), s, meta.availability)} names={names} teams={teams} season={s} limit={12} />}
            <RoleIndexSection rows={roleIndexRows(allEntries(), s, meta.availability)} names={names} teams={teams} season={s} perRole={5} roles={["QB", "RB", "WR/TE", "DEF", "K", "P"]} />
          </div>
        ))}
      </div>
    </main>
  );
}
