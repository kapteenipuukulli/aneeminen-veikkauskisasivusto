import { notFound } from "next/navigation";
import { PlayerAvatar } from "@/components/link-mode/avatar";
import { MatchMeta, TeamName } from "@/components/link-mode/common";
import { groupSlots } from "@/data/bracket";
import { contestPlayers } from "@/data/players";
import { teams } from "@/data/world-cup-2026";
import { getPlayerByToken, publicAdminUrl, publicPlayerUrl } from "@/lib/link-mode";
import { approveLinkedResult, resetLinkedContest, saveBracketSlot, saveLinkedChampionResult } from "./actions";

export default async function LinkedAdminPage({
  params,
  searchParams
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ message?: string }>;
}) {
  const { token } = await params;
  const { message } = await searchParams;
  const { supabase, player } = await getPlayerByToken(token);
  if (!player.is_admin) notFound();

  const [{ data: matches }, { data: results }, { data: championSetting }, { data: players }, { data: bracketSlots }] = await Promise.all([
    supabase.from("matches").select("*").order("starts_at"),
    supabase.from("match_results").select("*"),
    supabase.from("contest_settings").select("*").eq("key", "champion").maybeSingle(),
    supabase.from("contest_players").select("*").order("display_name"),
    supabase.from("bracket_slots").select("*")
  ]);

  const resultMap = new Map((results || []).map((item) => [item.match_id, item]));
  const slotMap = new Map((bracketSlots || []).filter((slot) => slot.team_name).map((slot) => [slot.slot_code, slot.team_name]));
  const baseUrl = process.env.SITE_URL || "http://localhost:3000";

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Admin link</p>
          <h1>Aneeminen veikkauskisasivusto</h1>
          <p>JP admin control room. Keep this link private.</p>
        </div>
      </section>
      <main className="shell grid">
        <section className="panel grid">
          {message ? <p className="warning">{message}</p> : null}
          <div className="topbar">
            <div className="row">
              <PlayerAvatar src={player.avatar_url} initials={player.initials} size={58} />
              <div>
                <p className="eyebrow">Admin</p>
                <h2>{player.display_name}</h2>
              </div>
            </div>
            <a className="pill" href={`/p/${token}`}>
              My predictions
            </a>
          </div>
        </section>

        <section className="panel grid">
          <div>
            <p className="eyebrow">Player links</p>
            <h2>Send these privately</h2>
          </div>
          <div className="grid">
            {(players || contestPlayers).map((item: any) => (
              <article className="card row" key={item.id}>
                <div className="row">
                  <PlayerAvatar src={item.avatar_url || item.avatarUrl} initials={item.initials} />
                  <strong>{item.display_name || item.displayName}</strong>
                </div>
                <code>
                  {baseUrl}
                  {item.is_admin ? publicAdminUrl(item.access_token || item.accessToken) : publicPlayerUrl(item.access_token || item.accessToken)}
                </code>
              </article>
            ))}
          </div>
        </section>

        <section className="panel grid">
          <div>
            <p className="eyebrow">Champion</p>
            <h2>Official champion</h2>
          </div>
          <form action={saveLinkedChampionResult} className="card row">
            <input name="token" type="hidden" value={token} />
            <label>
              Champion
              <select name="teamName" defaultValue={(championSetting?.value as string) || ""}>
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
        </section>

        <section className="panel grid">
          <div>
            <p className="eyebrow">Bracket</p>
            <h2>Group qualifiers and third-place slots</h2>
            <p className="muted">Set these after the group stage. Knockout winners advance automatically after results are approved.</p>
          </div>
          <div className="grid grid-3">
            {groupSlots.map((slot) => (
              <form action={saveBracketSlot} className="card grid" key={slot}>
                <input name="token" type="hidden" value={token} />
                <input name="slotCode" type="hidden" value={slot} />
                <label>
                  {slot}
                  <select name="teamName" defaultValue={slotMap.get(slot) || ""}>
                    <option value="">TBD</option>
                    {teamsForSlot(slot).map((team) => (
                      <option key={team.name} value={team.name}>
                        {team.flag} {team.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit">Save slot</button>
              </form>
            ))}
          </div>
        </section>

        <section className="panel grid">
          <div>
            <p className="eyebrow">Reset</p>
            <h2>Reset contest data</h2>
            <p className="muted">Type RESET before pressing a reset button.</p>
          </div>
          <div className="grid grid-2">
            <form action={resetLinkedContest} className="card grid">
              <input name="token" type="hidden" value={token} />
              <input name="mode" type="hidden" value="results" />
              <h3>Reset results only</h3>
              <p className="muted">Clears approved results, champion result and notification logs. Player predictions stay intact.</p>
              <label>
                Confirmation
                <input name="confirmation" placeholder="RESET" required />
              </label>
              <button type="submit">Reset results</button>
            </form>
            <form action={resetLinkedContest} className="card grid">
              <input name="token" type="hidden" value={token} />
              <input name="mode" type="hidden" value="all" />
              <h3>Reset everything</h3>
              <p className="muted">Clears all player predictions, champion picks, approved results and notification logs.</p>
              <label>
                Confirmation
                <input name="confirmation" placeholder="RESET" required />
              </label>
              <button type="submit">Reset predictions and results</button>
            </form>
          </div>
        </section>

        <section className="panel grid">
          <div>
            <p className="eyebrow">Results</p>
            <h2>Approve official results</h2>
          </div>
          <div className="grid">
            {(matches || []).map((match) => {
              const result = resultMap.get(match.id);
              return (
                <article className="card match" key={match.id}>
                  <div>
                    <span className={result?.status === "approved" ? "pill" : "pill red"}>{result?.status || "missing"}</span>
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
                    {!match.group_code ? <span>Slots: {match.home_team} vs {match.away_team}</span> : null}
                  </div>
                  <form action={approveLinkedResult} className="score-form">
                    <input name="token" type="hidden" value={token} />
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
      </main>
    </>
  );
}

function teamsForSlot(slot: string) {
  const groups = slotGroups(slot);
  if (!groups.length) return teams;
  return teams.filter((team) => groups.includes(team.group));
}

function slotGroups(slot: string) {
  if (/^[A-L][12]$/.test(slot)) return [slot[0]];
  if (/^[A-L]+3$/.test(slot)) return slot.replace("3", "").split("");
  return [];
}
