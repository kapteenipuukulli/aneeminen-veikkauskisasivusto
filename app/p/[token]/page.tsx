import { teams } from "@/data/world-cup-2026";
import { PlayerAvatar } from "@/components/link-mode/avatar";
import { MatchMeta, TeamName } from "@/components/link-mode/common";
import { getPlayerByToken } from "@/lib/link-mode";
import { rankWithSharedPlaces, scorePrediction } from "@/lib/scoring";
import { isLocked } from "@/lib/time";
import { saveLinkedChampionPick, saveLinkedPrediction, updateLinkedSettings } from "./actions";

export default async function PlayerPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ tab?: string; message?: string; filter?: string }>;
}) {
  const { token } = await params;
  const { tab = "predictions", message, filter = "all" } = await searchParams;
  const { supabase, player } = await getPlayerByToken(token);

  const [
    { data: matches },
    { data: predictions },
    { data: results },
    { data: leaderboard },
    { data: championPick },
    { data: championSetting },
    { data: bracketSlots }
  ] =
    await Promise.all([
      supabase.from("matches").select("*").order("starts_at"),
      supabase.from("player_predictions").select("*, contest_players(display_name,initials,avatar_url)").order("match_id"),
      supabase.from("match_results").select("*").eq("status", "approved"),
      supabase.from("player_leaderboard").select("*"),
      supabase.from("player_champion_picks").select("*").eq("player_id", player.id).maybeSingle(),
      supabase.from("contest_settings").select("*").eq("key", "champion").maybeSingle(),
      supabase.from("bracket_slots").select("*")
    ]);

  const predictionMap = new Map((predictions || []).map((item) => [`${item.player_id}:${item.match_id}`, item]));
  const myPredictionMap = new Map((predictions || []).filter((item) => item.player_id === player.id).map((item) => [item.match_id, item]));
  const resultMap = new Map((results || []).map((item) => [item.match_id, item]));
  const slotMap = new Map((bracketSlots || []).filter((slot) => slot.team_name).map((slot) => [slot.slot_code, slot.team_name]));
  const rows = rankWithSharedPlaces((leaderboard || []).sort((a, b) => b.total_points - a.total_points));
  const firstKickoff = Math.min(...(matches || []).map((match) => new Date(match.starts_at).getTime()));
  const championOpen = firstKickoff > Date.now();
  const filteredMatches = filterMatches(matches || [], filter, myPredictionMap);

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Personal prediction link</p>
          <h1>Aneeminen veikkauskisasivusto</h1>
          <p>No login needed. This private link is your key, so do not share it with rival masterminds.</p>
        </div>
      </section>
      <main className="shell grid">
        <section className="panel grid">
          {message ? <p className="warning">{message}</p> : null}
          <div className="topbar">
            <div className="row">
              <PlayerAvatar src={player.avatar_url} initials={player.initials} size={58} />
              <div>
                <p className="eyebrow">{player.is_admin ? "Admin player" : "Player"}</p>
                <h2>{player.display_name}</h2>
                <p className="muted">Predictions lock at kick-off. Missing prediction = 0 points.</p>
              </div>
            </div>
            {player.is_admin ? (
              <a className="pill" href={`/admin/${token}`}>
                Admin
              </a>
            ) : null}
          </div>

          <nav className="tabs">
            {["predictions", "leaderboard", "profile"].map((item) => (
              <a key={item} href={`/p/${token}?tab=${item}`} aria-current={tab === item ? "page" : undefined}>
                {item[0].toUpperCase() + item.slice(1)}
              </a>
            ))}
          </nav>
        </section>

        {tab === "predictions" ? (
          <section className="panel grid">
            <div className="section-head">
              <div>
                <p className="eyebrow">Predictions</p>
                <h2>Match list</h2>
              </div>
              <form action={saveLinkedChampionPick} className="row">
                <input name="token" type="hidden" value={token} />
                <label>
                  Champion pick
                  <select name="teamName" defaultValue={championPick?.team_name || ""} disabled={!championOpen}>
                    <option value="">Pick champion</option>
                    {teams.map((team) => (
                      <option key={team.name} value={team.name}>
                        {team.flag} {team.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button disabled={!championOpen} type="submit">
                  Save
                </button>
              </form>
            </div>
            <p className="muted">Champion pick locks when the opening match kicks off: 11 Jun 2026, 22:00 Finnish time.</p>
            <nav className="tabs" aria-label="Match filters">
              {[
                ["all", "All"],
                ["open", "Open"],
                ["missing", "Missing"],
                ["today", "Today"],
                ["groups", "Groups"],
                ["knockout", "Knockout"]
              ].map(([value, label]) => (
                <a key={value} href={`/p/${token}?tab=predictions&filter=${value}`} aria-current={filter === value ? "page" : undefined}>
                  {label}
                </a>
              ))}
            </nav>
            <div className="grid">
              {filteredMatches.length ? (
                filteredMatches.map((match) => {
                const locked = isLocked(match.starts_at);
                const mine = myPredictionMap.get(match.id);
                const result = resultMap.get(match.id);
                const points = scorePrediction(mine, result);
                const lockedRows = (predictions || []).filter((item) => item.match_id === match.id);

                return (
                  <article className="card match" key={match.id}>
                    <div>
                      <span className={locked ? "pill red" : "pill"}>{locked ? "Locked" : "Open"}</span>
                      <MatchMeta match={match} />
                    </div>
                    <div className="teams">
                      <strong>
                        <TeamName name={match.home_team} slots={slotMap} />
                      </strong>
                      <span>vs</span>
                      <strong>
                        <TeamName name={match.away_team} slots={slotMap} />
                      </strong>
                      {result ? (
                        <span>
                          Result: {result.home_score}-{result.away_score} | Your points: {points}
                        </span>
                      ) : null}
                    </div>
                    <form action={saveLinkedPrediction} className="score-form">
                      <input name="token" type="hidden" value={token} />
                      <input name="matchId" type="hidden" value={match.id} />
                      <label>
                        Home
                        <input name="homeScore" type="number" min="0" max="30" defaultValue={mine?.home_score ?? ""} disabled={locked} required />
                      </label>
                      <span className="muted">-</span>
                      <label>
                        Away
                        <input name="awayScore" type="number" min="0" max="30" defaultValue={mine?.away_score ?? ""} disabled={locked} required />
                      </label>
                      <button disabled={locked} type="submit">
                        Save
                      </button>
                    </form>
                    {locked ? (
                      <p className="muted">
                        Locked predictions:{" "}
                        {lockedRows.length
                          ? lockedRows
                              .map((row) => `${row.contest_players?.display_name || "Player"} ${row.home_score}-${row.away_score}`)
                              .join(", ")
                          : "none"}
                      </p>
                    ) : null}
                  </article>
                );
                })
              ) : (
                <article className="card">
                  <p className="muted">No matches in this filter.</p>
                </article>
              )}
            </div>
          </section>
        ) : null}

        {tab === "leaderboard" ? (
          <section className="panel grid">
            <div>
              <p className="eyebrow">Leaderboard</p>
              <h2>Shared places for tied scores</h2>
            </div>
            <ScoringInfo />
            {rows.map((row) => (
              <article className="card row" key={row.id}>
                <div className="row">
                  <span className="rank">{row.rank}</span>
                  <PlayerAvatar src={row.avatar_url} initials={row.initials} />
                  <div>
                    <strong>{row.display_name}</strong>
                    <p className="muted">
                      {row.match_points} match points | {row.champion_points} champion points
                    </p>
                  </div>
                </div>
                <strong>{row.total_points} pts</strong>
              </article>
            ))}
          </section>
        ) : null}

        {tab === "profile" ? (
          <section className="panel grid">
            <div>
              <p className="eyebrow">Profile</p>
              <h2>Email settings</h2>
            </div>
            <form action={updateLinkedSettings} className="grid">
              <input name="token" type="hidden" value={token} />
              <label>
                Email for reminders
                <input name="email" type="email" defaultValue={player.email || ""} />
              </label>
              <label>
                <span>Email notifications</span>
                <input name="emailNotifications" type="checkbox" defaultChecked={player.email_notifications_enabled} />
              </label>
              <label>
                <span>Prediction reminders one hour before kick-off</span>
                <input name="reminders" type="checkbox" defaultChecked={player.prediction_reminders_enabled} />
              </label>
              <button type="submit">Save settings</button>
            </form>
          </section>
        ) : null}
      </main>
    </>
  );
}

function ScoringInfo() {
  return (
    <div className="rules-strip" aria-label="Scoring rules">
      <article>
        <strong>5</strong>
        <span>Exact score</span>
      </article>
      <article>
        <strong>2</strong>
        <span>Correct winner/draw</span>
      </article>
      <article>
        <strong>1</strong>
        <span>Correct goal difference</span>
      </article>
      <article>
        <strong>12</strong>
        <span>Champion pick</span>
      </article>
    </div>
  );
}

function filterMatches(matches: any[], filter: string, myPredictionMap: Map<string, any>) {
  const now = new Date();
  const helsinkiDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);

  return matches.filter((match) => {
    if (filter === "open") return !isLocked(match.starts_at);
    if (filter === "missing") return !isLocked(match.starts_at) && !myPredictionMap.has(match.id);
    if (filter === "today") {
      const matchDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Helsinki",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date(match.starts_at));
      return matchDate === helsinkiDate;
    }
    if (filter === "groups") return Boolean(match.group_code);
    if (filter === "knockout") return !match.group_code;
    return true;
  });
}
