export default function TermsPage() {
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Terms</p>
          <h1>Contest rules</h1>
        </div>
      </section>
      <main className="shell">
        <section className="panel grid">
          <p>This is a private prediction contest for friends. It is not gambling and has no public registration.</p>
          <p>Predictions lock at kick-off. Missing prediction means 0 points for that match.</p>
          <p>
            Scoring: exact score 6 points, correct winner or draw 3 points, correct goal difference 2 points, one
            team's goals exactly right and the other team's goals off by at most one 1 point, correct champion 20
            points. Tied leaderboard scores share the same rank.
          </p>
          <p>Automatic results must be approved by the admin before they become official for scoring.</p>
        </section>
      </main>
    </>
  );
}
