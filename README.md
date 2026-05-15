# Aneeminen veikkauskisasivusto

Private World Cup 2026 prediction contest for friends.

## What is included

- Next.js App Router application
- Supabase authentication with email and password
- invite-only registration
- passwordless personal links for OJ, MM, JP, AK and TT
- JP admin link
- forgot password flow
- one admin, controlled by `ADMIN_EMAIL`
- avatar upload support through Supabase Storage
- email notifications on/off
- prediction reminders on/off
- one-hour missing-prediction reminder cron endpoint
- match predictions that lock at kick-off
- champion pick that locks before the first match
- admin-approved results
- audit log for admin result/champion changes
- automatic leaderboard with shared ranks for tied scores
- group standings from approved results
- manual group qualifier slots for the knockout bracket
- automatic knockout winner advancement after admin-approved results
- FIFA news tab through a server route
- privacy policy and contest terms pages

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Supabase project.

3. Run the SQL in `supabase/schema.sql` in the Supabase SQL editor.

4. Create a public Supabase Storage bucket named `avatars`.

5. Copy `.env.example` to `.env.local` and fill in the values.

6. In Supabase SQL editor, set the admin email setting used by RLS:

   ```sql
   alter database postgres set app.admin_email = 'your-email@example.com';
   ```

   Then restart the Supabase project or reconnect sessions.

7. Run the link-mode SQL in `supabase/link-mode.sql`.

8. Seed teams, matches, invite code and link players after the app is running:

   ```bash
   curl -X POST http://localhost:3000/api/admin/seed \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

9. Start development:

   ```bash
   npm run dev
   ```

## Environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAIL`
- `SITE_URL`
- `INVITE_CODE`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `CRON_SECRET`
- `LIVE_RESULTS_API_URL`
- `LIVE_RESULTS_API_KEY`
- `FOOTBALL_DATA_API_KEY`

## Cron endpoints

Prediction reminders:

```bash
curl -X POST https://your-site.com/api/cron/reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Live result import:

```bash
curl -X POST https://your-site.com/api/cron/fetch-results \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Imported live results are saved as `pending`. The admin must approve them before points and emails become official.

The built-in importer uses football-data.org when `FOOTBALL_DATA_API_KEY` is configured. It sends the key as the
`X-Auth-Token` header and imports finished matches only.

## Knockout bracket slots

The knockout bracket uses slot codes such as `A1`, `A2`, `W73` and `L101`.

- After the group stage, JP sets the group qualifier slots manually in the admin page.
- Player pages show unresolved slots as `TBD`.
- When JP approves a knockout result, the winner is automatically written to the next `W...` slot.
- Semi-final losers are written to `L101` and `L102`, which fill the third-place match.

If this feature is added to an existing Supabase project, run `supabase/link-mode.sql` again. It is written with `if not exists` for the new tables.

## Important rules

- Predictions lock at kick-off.
- Missing prediction = 0 points.
- Other players' predictions become visible only after the match has locked.
- Exact score = 6 points.
- Correct winner/draw = 3 points.
- Correct goal difference = 2 points.
- One team's goals exactly right and the other team's goals off by at most one = 1 point.
- Correct champion = 20 points.
- Tied scores share the same leaderboard rank.
- Personal data is used only for this private friends contest.

## Personal links

After seeding, JP can open the admin link and copy every player's private URL:

```text
http://localhost:3000/admin/jp_admin_41a3d5ed9c6e4896a2f3ef83d8a705b4
```

Player links do not require login. Anyone with a player's link can edit that player's predictions, so links must be sent privately.

Current seeded links:

- OJ: `/p/oj_7f4b91b2d8ac4f2ab6e0f6b9c2d5a143`
- MM: `/p/mm_c2d83f1a9e5b4d85a17f8db4206fbc75`
- JP admin: `/admin/jp_admin_41a3d5ed9c6e4896a2f3ef83d8a705b4`
- AK: `/p/ak_91cc5d6fb4b448b9a35319d407347c2e`
- TT: `/p/tt_e0c9ae64ff1f45768c6d19dfe218b937`

## Avatars

Place player avatar files here:

```text
public/avatars/oj.jpg
public/avatars/mm.jpg
public/avatars/jp.jpg
public/avatars/ak.jpg
public/avatars/tt.jpg
```

If an image file is missing, the UI falls back to initials.
