import { updatePassword } from "../actions";

export default function ResetPasswordPage() {
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Set a new password</h1>
        </div>
      </section>
      <main className="shell">
        <form action={updatePassword} className="panel auth-card grid">
          <label>
            New password
            <input name="password" type="password" minLength={8} required />
          </label>
          <button type="submit">Update password</button>
        </form>
      </main>
    </>
  );
}
