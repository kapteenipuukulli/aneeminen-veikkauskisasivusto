import { formatFinnishTime } from "@/lib/time";
import { teamByName } from "@/data/world-cup-2026";

export function TeamName({ name }: { name: string }) {
  const team = teamByName.get(name);
  return (
    <>
      {team?.flag ? `${team.flag} ` : ""}
      {name}
    </>
  );
}

export function MatchMeta({ match }: { match: any }) {
  return (
    <p className="muted">
      {formatFinnishTime(match.starts_at)} | {match.stage} | {match.city}, {match.country}
    </p>
  );
}
