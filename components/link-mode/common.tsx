import { formatFinnishTime } from "@/lib/time";
import { teamByName } from "@/data/world-cup-2026";

export function TeamName({ name }: { name: string }) {
  const team = teamByName.get(name);
  if (!team && isPlaceholderTeam(name)) {
    return <>TBD</>;
  }

  return (
    <>
      {team?.flag ? `${team.flag} ` : ""}
      {name}
    </>
  );
}

function isPlaceholderTeam(name: string) {
  return (
    name === "TBD" ||
    /^[A-L][12]$/.test(name) ||
    /^[A-L]+3$/.test(name) ||
    /^(Round of 16|Quarter-final|Semi-final|Third-place match|Final)/.test(name)
  );
}

export function MatchMeta({ match }: { match: any }) {
  return (
    <p className="muted">
      {formatFinnishTime(match.starts_at)} | {match.stage} | {match.city}, {match.country}
    </p>
  );
}
