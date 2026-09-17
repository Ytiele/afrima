# Afrima Digi-Health

Live nutrition/health consultations: a patient joins a queue, the first
available practitioner to click **Answer** is atomically assigned them, and
the two are dropped into a private Daily video room. Built with Next.js 16
(App Router) + TypeScript + Tailwind, Supabase (Postgres, Auth, Realtime,
RLS), and Daily for WebRTC.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com) (free tier is fine).
2. In the SQL Editor, run the three files in `supabase/migrations/` **in order**:
   `0001_schema.sql` → `0002_functions.sql` → `0003_rls.sql`.
3. From Project Settings → API, copy the **Project URL**, **anon public**
   key, and **service_role** key.

## 2. Set up Daily

1. Create an account at [dashboard.daily.co](https://dashboard.daily.co) (free tier is fine).
2. Developers → copy your **API key**.
3. Note your Daily subdomain (shown in the dashboard URL / your rooms'
   URLs), e.g. `your-team.daily.co` — this is `DAILY_DOMAIN` below, **without**
   `https://`.

## 3. Environment variables

Copy `.env.local.example` to `.env.local` and fill in the five values from
steps 1–2. **Never** put `SUPABASE_SERVICE_ROLE_KEY` or `DAILY_API_KEY`
behind `NEXT_PUBLIC_` — only the two Supabase values that are already
prefixed that way are safe for the browser.

On Vercel, add the same five as Project → Settings → Environment Variables.

## 4. Provision the practitioner and admin accounts

There's no public sign-up for these roles by design (a small, known staff
list, not open registration). Create each one in two steps:

**a. Create the auth user** — Supabase Dashboard → Authentication → Users →
Add user (check "Auto Confirm User").

**b. Link the profile.** Once you have the new user's UUID (shown in the
Users table), run in the SQL Editor:

```sql
-- Practitioner
insert into profiles (user_id, full_name, role) values ('<uuid>', 'Dr. Jane Smith', 'PRACTITIONER');
insert into practitioners (user_id, full_name) values ('<uuid>', 'Dr. Jane Smith');

-- Admin
insert into profiles (user_id, full_name, role) values ('<uuid>', 'Afrima Admin', 'ADMIN');
```

Repeat for the second practitioner. Patients register themselves at
`/register`.

## 5. Run it

```bash
npm install
npm run dev
```

## How the atomic claim works

Two practitioners can see the same waiting patient and click **Answer**
within milliseconds of each other. `claim_consultation()` in
`supabase/migrations/0002_functions.sql` is the only thing that can move a
consultation out of `WAITING` — it's a single
`UPDATE consultations SET status = 'CLAIMED', ... WHERE status = 'WAITING'`.
Postgres's row locking guarantees only one of the two concurrent calls can
match that `WHERE` clause; the second gets zero rows back and the API
route turns that into "This patient has already been taken by another
practitioner." There's no separate check-then-act step to race.

Every other state-changing action (ending a call, admin actions,
suspending/reactivating a practitioner) follows the same pattern: a
`SECURITY DEFINER` Postgres function that re-validates the precondition
inside the same statement that changes it, callable only through a
Next.js Route Handler using the caller's own session — never the
service-role key from the browser.

## What's here vs. what's still unverified

Built and wired end-to-end: auth (patient self-registration; practitioner/
admin provisioned per above), the full consultation state machine, atomic
claim, realtime queue/dashboard updates, Daily video via each side's own
short-lived token, prescriptions with structured items and server-rendered
PDF download, and the full admin dashboard (stats, live rooms, ongoing
calls, waiting queue, history with filters/pagination, audit log).

`npm run build` and `npm run lint` both pass clean.

**Not yet verified against live Supabase/Daily projects** — this was built
and build-checked without real credentials, since none existed yet. Before
relying on it in production: run through the acceptance criteria in the
original spec end-to-end (especially the concurrent-claim scenario with
two real practitioner sessions), and double-check the RLS policies against
real data with the Supabase dashboard's policy tester.
