import { formatFinnishTime } from "@/lib/time";
import { isSlotCode } from "@/data/bracket";
import { teamByName } from "@/data/world-cup-2026";

export function TeamName({ name, slots }: { name: string; slots?: Map<string, string> }) {
  const resolvedName = slots?.get(name) || name;
  const team = teamByName.get(resolvedName);
  if (!team && isPlaceholderTeam(resolvedName)) {
    return <>TBD</>;
  }

  return (
    <>
      {team?.flag ? `${team.flag} ` : ""}
      {resolvedName}
    </>
  );
}

function isPlaceholderTeam(name: string) {
  return (
    name === "TBD" ||
    isSlotCode(name) ||
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
