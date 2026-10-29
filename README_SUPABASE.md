# SKAS 3.0 — Supabase / chat setup

## Already implemented
- Student roster **БҚ-332** (8 students), personal demo PINs `0001`–`0008`.
- Existing five teachers and their assigned 7 subjects.
- Visible **Жүйеден шығу** logout button in the sidebar.
- SKAS Learning: 140 bilingual RU/KZ introductory lessons, examples, exercises, one mini-question per lesson.
- Teacher ↔ student messages tied to a discipline, stored in Supabase; teacher may only access assigned subjects.
- Lesson completion can sync to Supabase for student accounts.
- In-browser tests/results remain DEMO ONLY; they are not migrated to Supabase.

## Connect Supabase
1. In Supabase **SQL Editor**, run `SUPABASE_SETUP.sql` once. It creates separate `skas_*` tables and a server-only PIN verification function.
2. In Vercel → Project → Settings → Environment Variables set:
   - `SUPABASE_URL` = your Supabase project URL.
   - `SUPABASE_SERVICE_ROLE_KEY` = Supabase service-role key. **Server only. NEVER prefix with VITE_**.
   - `SKAS_SESSION_SECRET` = random secret of at least 32 characters (ideally `openssl rand -hex 32`).
   - `VITE_SKAS_BACKEND` = `1`.
3. Redeploy in Vercel.
4. Test: log in as a student, choose a teacher + their subject, send a message; then log in as that teacher and select subject + student to read it.

## Limitations and security before real deployment
- The `0001`–`0008` student PINs and old four-digit teacher PINs are **publicly known** and trivial to guess. They are for coursework demos only. Change them and add rate limiting / account lockout before using real student data.
- Teacher PINs are still visible in the legacy client-side demo API. Server-side hash verification is used in connected mode, but codes are not secret until replaced.
- This is a **custom demo session**, not Supabase Auth. Tokens live in sessionStorage and expire after 8 hours. For real deployment, move to Supabase Auth with unique credentials, RLS and proper identity verification.
- Chat refreshes every 6 seconds (polling), not Supabase Realtime.
- `skas_accounts` and `skas_messages` use separate server-only tables. Existing `profiles`, `subjects`, `exams`, `questions`, `attempts` are not overwritten.
- Legacy examination results, test editing and some lesson progress are stored in browser localStorage; they are **not cross-device**.
- One brief theory paragraph and one multiple-choice question per lesson: these are introductory lessons, not full academic lectures.
- Never publish real student grades/messages until strong authentication, rate limiting, privacy review, server-side exam grading and database migration are complete.

## Run
`npm ci && npm run dev` / `npm run build`

The connected chat is designed for Vercel serverless function `/api/school`, not Vite's standalone development server. To test server endpoints locally, use Vercel CLI with environment variables.
