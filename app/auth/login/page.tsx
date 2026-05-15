import Link from "next/link";
import { signIn, signUp, resetPassword } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const { message } = await searchParams;

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Private World Cup 2026 contest</p>
          <h1>Aneeminen veikkauskisa</h1>
          <p>Predict scores, forget one, get zero. Football justice, but polite.</p>
        </div>
      </section>
      <main className="shell">
        <section className="panel auth-card grid">
          {message ? <p className="warning">{message}</p> : null}
          <p className="warning">
            Käytä jotain spämmilaatikkoa tmv- Älä työpaikan postilaatikkoa kirjaantumiseen!!!
          </p>
          <div className="grid grid-2">
            <form action={signIn} className="grid card">
              <div>
                <p className="eyebrow">Login</p>
                <h2>Welcome back</h2>
              </div>
              <label>
                Email
                <input name="email" type="email" required />
              </label>
              <label>
                Password
                <input name="password" type="password" required />
              </label>
              <button type="submit">Login</button>
            </form>

            <form action={signUp} className="grid card">
              <div>
                <p className="eyebrow">Register</p>
                <h2>Join with invite</h2>
              </div>
              <label>
                Display name
                <input name="displayName" required />
              </label>
              <label>
                Email
                <input name="email" type="email" required />
              </label>
              <label>
                Password
                <input name="password" type="password" minLength={8} required />
              </label>
              <label>
                Invite code
                <input name="inviteCode" required />
              </label>
              <button type="submit">Create account</button>
            </form>
          </div>

          <form action={resetPassword} className="card grid">
            <div>
              <p className="eyebrow">Forgot password</p>
              <h2>Send reset link</h2>
            </div>
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <button type="submit">Send password reset</button>
          </form>
          <Link href="/">Back to front page</Link>
        </section>
      </main>
    </>
  );
}
