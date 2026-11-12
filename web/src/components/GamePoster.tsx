import type { TeamLite } from "@/lib/dashboard";
import TeamLogo from "./TeamLogo";

/** Plakat fuer ein Spiel-Video: beide Teamlogos auf Rasenlinien, ohne Daten von YouTube. */
export default function GamePoster({ away, home, label, size = 76 }: { away: TeamLite | undefined; home: TeamLite | undefined; label?: string; size?: number }) {
  return (
    <span className="video-poster absolute inset-0 flex flex-col items-center justify-center gap-3" aria-hidden="true">
      <span className="flex w-full items-center justify-between px-[16%]">
        <TeamLogo team={away} size={size} className="!bg-transparent !shadow-none" />
        <TeamLogo team={home} size={size} className="!bg-transparent !shadow-none" />
      </span>
      {label && <span className="display absolute left-4 top-3 text-[15px] font-semibold text-white/85">{label}</span>}
    </span>
  );
}
