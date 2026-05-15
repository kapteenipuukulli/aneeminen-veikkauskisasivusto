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
            Scoring: exact score 5 points, correct winner or draw 2 points, correct goal difference 1 point, correct
            champion 12 points. Tied leaderboard scores share the same rank.
          </p>
          <p>Automatic results must be approved by the admin before they become official for scoring.</p>
        </section>
      </main>
    </>
  );
}
