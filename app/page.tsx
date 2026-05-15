import Link from "next/link";
import { contestPlayers } from "@/data/players";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const adminPlayer = contestPlayers.find((player) => player.isAdmin);

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">World Cup 2026</p>
          <h1>Aneeminen veikkauskisa</h1>
          <p>
            Private prediction contest with score picks, a champion pick, leaderboard, reminders, FIFA news and
            admin-approved results.
          </p>
        </div>
      </section>
      <main className="shell">
        <section className="panel grid">
          <div className="section-head">
            <div>
              <p className="eyebrow">Friends only</p>
              <h2>Predict before kick-off. Miss it and it is 0 points.</h2>
            </div>
            <Link className="pill" href={adminPlayer ? `/admin/${adminPlayer.accessToken}` : user ? "/dashboard" : "/auth/login"}>
              Open JP admin link
            </Link>
          </div>
          <div className="grid grid-3">
            <article className="card">
              <h3>Locked predictions</h3>
              <p className="muted">Each match locks at kick-off. Other players' predictions appear after lock.</p>
            </article>
            <article className="card">
              <h3>Shared ranks</h3>
              <p className="muted">Ties stay tied: 1, 1, 3. No weird tiebreak drama.</p>
            </article>
            <article className="card">
              <h3>Email reminders</h3>
              <p className="muted">Optional reminders go out one hour before a match if your prediction is missing.</p>
            </article>
          </div>
        </section>
      </main>
    </>
  );
}
