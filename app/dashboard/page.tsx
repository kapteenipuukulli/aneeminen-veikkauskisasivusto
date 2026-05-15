import { redirect } from "next/navigation";
import { isAdminEmail, requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatFinnishTime, isLocked } from "@/lib/time";
import { rankWithSharedPlaces, scorePrediction } from "@/lib/scoring";
import { fetchFifaNews } from "@/lib/news";
import { matches as fallbackMatches, teams, teamByName } from "@/data/world-cup-2026";
import { signOut } from "@/app/auth/actions";
import { approveResult, saveChampionPick, saveChampionResult, savePrediction, updateProfile } from "./actions";

type DashboardSearchParams = {
  tab?: string;
  message?: string;
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<DashboardSearchParams> }) {
  const params = await searchParams;
  const activeTab = params.tab || "predictions";
  const { supabase, user } = await requireUser();
  const admin = isAdminEmail(user.email);
  const db = admin ? createAdminClient() : supabase;

  const [{ data: profile }, { data: dbMatches }, { data: predictions }, { data: results }, { data: leaderboard }, { data: championPick }, { data: championSetting }] =
    await Promise.all([
      db.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      db.from("matches").select("*").order("starts_at"),
      db.from("predictions").select("*, profiles(display_name)"),
      db.from("match_results").select("*"),
      db.from("leaderboard").select("*"),
      db.from("champion_picks").select("*").eq("user_id", user.id).maybeSingle(),
      db.from("contest_settings").select("*").eq("key", "champion").maybeSingle()
    ]);

  const matches = dbMatches?.length
    ? dbMatches
    : fallbackMatches.map((match) => ({
        id: match.id,
        stage: match.stage,
        group_code: match.groupCode,
        home_team: match.home,
        away_team: match.away,
        starts_at: match.startsAtUtc,
        tv: match.tv,
        city: match.city,
        country: match.country
      }));

  if (!profile) redirect("/auth/login");

  const predictionMap = new Map((predictions || []).map((prediction) => [`${prediction.user_id}:${prediction.match_id}`, prediction]));
  const myPredictionMap = new Map((predictions || []).filter((prediction) => prediction.user_id === user.id).map((prediction) => [prediction.match_id, prediction]));
  const resultMap = new Map((results || []).map((result) => [result.match_id, result]));
  const rankedRows = rankWithSharedPlaces((leaderboard || []).sort((a, b) => b.total_points - a.total_points));
  const firstMatchTime = Math.min(...matches.map((match) => new Date(match.starts_at).getTime()));
  const championOpen = firstMatchTime > Date.now();
  const champion = championSetting?.value as string | undefined;
  const standings = calculateStandings(matches, results || []);

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Private contest</p>
          <h1>Aneeminen veikkauskisasivusto</h1>
          <p>All match times are shown in Finnish time. Predictions lock at kick-off. Missing prediction = 0 points.</p>
        </div>
      </section>

      <main className="shell grid">
        <section className="panel grid">
          {params.message ? <p className="warning">{params.message}</p> : null}
          <div className="topbar">
            <div className="row">
              {profile.avatar_url ? <img className="avatar" src={profile.avatar_url} alt="" /> : <span className="avatar" />}
              <div>
                <p className="eyebrow">{admin ? "Admin" : "Player"}</p>
                <h2>{profile.display_name}</h2>
                <p className="muted">{user.email}</p>
              </div>
            </div>
            <form action={signOut}>
              <button type="submit">Logout</button>
            </form>
          </div>

          <nav className="tabs" aria-label="Dashboard tabs">
            {["predictions", "leaderboard", "groups", "news", "profile", ...(admin ? ["admin"] : [])].map((tab) => (
              <a key={tab} href={`/dashboard?tab=${tab}`} aria-current={activeTab === tab ? "page" : undefined}>
                {tab[0].toUpperCase() + tab.slice(1)}
              </a>
            ))}
          </nav>
        </section>

        {activeTab === "predictions" ? (
          <section className="panel grid">
            <div className="section-head">
              <div>
                <p className="eyebrow">Predictions</p>
                <h2>Match list</h2>
              </div>
              <form action={saveChampionPick} className="row">
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
            <div className="grid">
              {matches.map((match) => {
                const locked = isLocked(match.starts_at);
                const mine = myPredictionMap.get(match.id);
                const result = resultMap.get(match.id);
                const points = scorePrediction(mine, result);
                const home = teamByName.get(match.home_team);
                const away = teamByName.get(match.away_team);

                return (
                  <article className="card match" key={match.id}>
                    <div>
                      <span className={locked ? "pill red" : "pill"}>{locked ? "Locked" : "Open"}</span>
                      <p className="muted">
                        {formatFinnishTime(match.starts_at)} | {match.stage} | {match.city}, {match.country}
                      </p>
                    </div>
                    <div className="teams">
                      <strong>
                        {home?.flag} {match.home_team}
                      </strong>
                      <span>vs</span>
                      <strong>
                        {away?.flag} {match.away_team}
                      </strong>
                      {result?.status === "approved" ? (
                        <span>
                          Result: {result.home_score}-{result.away_score} | Your points: {points}
                        </span>
                      ) : null}
                    </div>
                    <form action={savePrediction} className="score-form">
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
                    {locked ? <LockedPredictions matchId={match.id} predictions={predictions || []} predictionMap={predictionMap} /> : null}
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {activeTab === "leaderboard" ? (
          <section className="panel grid">
            <div>
              <p className="eyebrow">Leaderboard</p>
              <h2>Shared places for tied scores</h2>
            </div>
            <div className="grid">
              {rankedRows.map((row) => (
                <article className="card row" key={row.id}>
                  <div className="row">
                    <span className="rank">{row.rank}</span>
                    {row.avatar_url ? <img className="avatar" src={row.avatar_url} alt="" /> : <span className="avatar" />}
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
            </div>
          </section>
        ) : null}

        {activeTab === "groups" ? (
          <section className="panel grid">
            <div>
              <p className="eyebrow">Groups</p>
              <h2>Automatic standings from approved results</h2>
            </div>
            <div className="grid grid-3">
              {Object.entries(standings).map(([group, rows]) => (
                <article className="card grid" key={group}>
                  <h3>Group {group}</h3>
                  {rows.map((row, index) => (
                    <div className="row" key={row.team}>
                      <span>
                        {teamByName.get(row.team)?.flag} {row.team}
                      </span>
                      <span className="muted">
                        {row.points} pts {index < 2 ? "Qualified" : index === 2 ? "Third-place race" : "At risk"}
                      </span>
                    </div>
                  ))}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {activeTab === "news" ? <NewsPanel /> : null}

        {activeTab === "profile" ? (
          <section className="panel grid">
            <div>
              <p className="eyebrow">Profile</p>
              <h2>Avatar and notifications</h2>
            </div>
            <form action={updateProfile} className="grid" encType="multipart/form-data">
              <label>
                Display name
                <input name="displayName" defaultValue={profile.display_name} required />
              </label>
              <label>
                Avatar
                <input name="avatar" type="file" accept="image/png,image/jpeg,image/webp" />
              </label>
              <label>
                <span>Email notifications</span>
                <input name="emailNotifications" type="checkbox" defaultChecked={profile.email_notifications_enabled} />
              </label>
              <label>
                <span>Prediction reminders one hour before kick-off</span>
                <input name="reminders" type="checkbox" defaultChecked={profile.prediction_reminders_enabled} />
              </label>
              <button type="submit">Save profile</button>
            </form>
          </section>
        ) : null}

        {activeTab === "admin" && admin ? (
          <section className="panel grid">
            <div>
              <p className="eyebrow">Admin</p>
              <h2>Approve official results</h2>
            </div>
            <form action={saveChampionResult} className="card row">
              <label>
                Official champion
                <select name="teamName" defaultValue={champion || ""}>
                  <option value="">Not decided</option>
                  {teams.map((team) => (
                    <option key={team.name} value={team.name}>
                      {team.flag} {team.name}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit">Save champion</button>
            </form>
            <div className="grid">
              {matches.map((match) => {
                const result = resultMap.get(match.id);
                return (
                  <article className="card match" key={match.id}>
                    <div>
                      <span className={result?.status === "approved" ? "pill" : "pill red"}>{result?.status || "missing"}</span>
                      <p className="muted">
                        {formatFinnishTime(match.starts_at)} | {match.city}
                      </p>
                    </div>
                    <div className="teams">
                      <strong>{match.home_team}</strong>
                      <span>vs</span>
                      <strong>{match.away_team}</strong>
                    </div>
                    <form action={approveResult} className="score-form">
                      <input name="matchId" type="hidden" value={match.id} />
                      <label>
                        Home
                        <input name="homeScore" type="number" min="0" max="30" defaultValue={result?.home_score ?? ""} required />
                      </label>
                      <span className="muted">-</span>
                      <label>
                        Away
                        <input name="awayScore" type="number" min="0" max="30" defaultValue={result?.away_score ?? ""} required />
                      </label>
                      <button type="submit">Approve</button>
                    </form>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </main>
    </>
  );
}

function LockedPredictions({
  matchId,
  predictions
}: {
  matchId: string;
  predictions: Array<{ match_id: string; home_score: number; away_score: number; profiles?: { display_name: string } }>;
  predictionMap: Map<string, unknown>;
}) {
  const rows = predictions.filter((prediction) => prediction.match_id === matchId);
  if (!rows.length) return <p className="muted">No visible predictions yet.</p>;
  return (
    <p className="muted">
      Locked predictions:{" "}
      {rows.map((row) => `${row.profiles?.display_name || "Player"} ${row.home_score}-${row.away_score}`).join(", ")}
    </p>
  );
}

async function NewsPanel() {
  let items: Array<{ title: string; url: string }> = [];
  try {
    items = await fetchFifaNews();
  } catch {
    items = [];
  }

  return (
    <section className="panel grid">
      <div>
        <p className="eyebrow">News</p>
        <h2>FIFA World Cup 2026 news</h2>
      </div>
      <div className="grid grid-3">
        {items.length ? (
          items.map((item) => (
            <article className="card grid" key={item.title}>
              <h3>{item.title}</h3>
              <a className="pill" href={item.url} target="_blank" rel="noreferrer">
                Read on FIFA.com
              </a>
            </article>
          ))
        ) : (
          <p className="muted">News could not be loaded right now.</p>
        )}
      </div>
    </section>
  );
}

function calculateStandings(matches: any[], results: any[]) {
  const table: Record<string, Record<string, { team: string; points: number; gd: number; gf: number }>> = {};
  for (const team of teams) {
    table[team.group] ||= {};
    table[team.group][team.name] = { team: team.name, points: 0, gd: 0, gf: 0 };
  }

  for (const result of results.filter((item) => item.status === "approved")) {
    const match = matches.find((item) => item.id === result.match_id);
    if (!match?.group_code) continue;
    const group = table[match.group_code];
    const home = group?.[match.home_team];
    const away = group?.[match.away_team];
    if (!home || !away) continue;

    home.gf += result.home_score;
    away.gf += result.away_score;
    home.gd += result.home_score - result.away_score;
    away.gd += result.away_score - result.home_score;
    if (result.home_score > result.away_score) home.points += 3;
    else if (result.home_score < result.away_score) away.points += 3;
    else {
      home.points += 1;
      away.points += 1;
    }
  }

  return Object.fromEntries(
    Object.entries(table).map(([group, rows]) => [
      group,
      Object.values(rows).sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team))
    ])
  );
}
