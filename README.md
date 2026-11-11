# حمثلاح | Hamthalah Games

An Arabic-language site for Mr. Salah's team and students, built with Next.js 15 (App Router) and Supabase. It keeps the look of the original Hamthalah site (same colors, fonts, wheel and grade cards) and adds:

- Student accounts (phone number or email) with a grade (المرحلة) and a track (الشعبة: بكالوريا / ثانوية عامة).
- A wheel as the student's home: after signing up or logging in, the student spins it and it picks one of six sections for them: مسابقات، ألعاب، ع السريع، نصايح، فيديوهات تحفيزية، سؤال اليوم.
- 9 game types: multiple choice, true/false, matching, memory cards, sentence scramble, fill in the blank, classify, word search, and ركّبها (a picture puzzle where students swap pieces until the image is whole).
- Points, a weekly and all-time leaderboard per grade and track, badges and attempt history.
- An admin dashboard to manage every section (games, «ع السريع» quizzes, contests, tips, videos, the daily question), target content at specific grades and tracks, preview, publish, and manage students, grades, tracks and the homepage quotes.

The original static site is kept in `legacy/` for reference.

## Setup

### 1. Create the database

Create a project on [supabase.com](https://supabase.com), then open **SQL Editor** and run these files in order:

1. `supabase/migrations/20261110000000_init.sql` (tables, security rules, functions, the `game-media` storage bucket)
2. `supabase/migrations/20261111000000_puzzle.sql` (adds the ركّبها game type)
3. `supabase/migrations/20261112000000_hub.sql` (quizzes and contests, tips, videos, daily questions)
4. `supabase/seed.sql` (the 4 grades, 2 tracks, the homepage quotes, sample games of every type, sample tips and one «ع السريع» quiz)

If you use the Supabase CLI instead: `npx supabase link --project-ref <ref>` then `npx supabase db push`, and run `seed.sql` in the SQL Editor.

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill it from **Project Settings > API Keys**:

| Variable | What it is |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The anon (or publishable) key |
| `SUPABASE_SERVICE_ROLE_KEY` | The service_role (or secret) key. Server only. |
| `PHONE_EMAIL_DOMAIN` | Domain for the internal login emails of phone sign-ups (students never see it) |

The service role key is needed to save game scores, to sign up with a phone number, and for the admin's "new student", "reset password" and "delete account" actions. Without it the site still runs, but results are not saved and only email sign-up works (with Supabase's email confirmation).

### 3. Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

### 4. Make yourself an admin

Sign up on the site like a student, then run this in the SQL Editor (use your phone number or email):

```sql
update public.profiles set role = 'admin' where phone = '01012345678';
-- or: where email = 'you@example.com'
```

Log out and back in, and you will land on `/admin`. From then on you can promote other accounts from **الطلاب** in the dashboard.

### 5. Auth settings (Supabase dashboard)

In **Authentication > URL Configuration**, set the Site URL to your domain and add `https://your-domain/auth/callback` to the redirect URLs. This is only used by email confirmation links.

## Running everything locally (optional)

With Docker running:

```bash
npx supabase start      # applies the migration and seed automatically
npx supabase status     # prints the local URL, anon key and service_role key
```

Put those values in `.env.local`. Studio is at http://127.0.0.1:54323. Then make your account an admin with:

```bash
docker exec supabase_db_hamthalah-code psql -U postgres -c "update public.profiles set role = 'admin' where email = 'you@example.com';"
```

## How it works

### The wheel and its sections

`/wheel` is where students land after signing up or logging in. Spinning picks one of the sections that has something for the student's grade right now, never the same one twice in a row, and opens it. A section with nothing in it is greyed out on the wheel until the admin adds something; the dashboard's «العجلة النهارده» panel shows which ones are empty.

| Section | Student page | Managed from | What it is |
| --- | --- | --- | --- |
| مسابقات | `/contests`, `/contests/[slug]` | `/admin/contests` | Timed contests with a start and end time and an optional prize. Students see an upcoming contest with a countdown but not its questions. Each student gets one attempt, and the ranking is by score, then by time. |
| ألعاب | `/games` (the student's grade page) | `/admin/games` | The 9 game types. |
| ع السريع | `/quick`, `/quick/[slug]` | `/admin/quick` | Multiple-choice quizzes like the team's original «ع السريع» site: a timer per question, an optional passage, an explanation for every option, and "مشكلتك" tags that add up on the result screen. |
| نصايح | `/tips` | `/admin/tips` | Short tips, shown one at a time. |
| فيديوهات تحفيزية | `/videos` | `/admin/videos` | Links from YouTube, Facebook, TikTok, Instagram or Google Drive, played inside the page. |
| سؤال اليوم | `/daily` | `/admin/daily` | One question a day. Students answer in the comments of the Facebook group post (or the group itself when no post link is set). Questions can be prepared for future days. |

Tips, videos and daily questions can be for every grade or for one grade. Games, quizzes and contests use targets (see below).

In the «ع السريع» editor, a wrong option's explanation can start with `خطأ؛ (مشكلتك: عدم التركيز)؛` (the chips under each option insert it). The bulk import box also accepts the original site's question data as is: a JSON array of `{ s, q, o, a, e }` (passage, question, options, correct index, explanation per option), or the whole `const D = {...}` block.

### Games and targeting

Every game has a type, a title, a topic (نحو، بلاغة...), a difficulty, its content and its settings: time limit, time per question, points per correct answer, number of allowed attempts, shuffling, and whether explanations are shown.

A game is shown to students according to its targets. Each target is a grade plus either one track or all tracks. For example, "٣ ثانوي (all tracks)" plus "أولى ثانوي (بكالوريا)". Drafts are hidden from students, and a game can't be published without valid content and at least one target.

All editors except classify, word search and ركّبها have a bulk import box that shows an example of its format. For multiple choice, write the question on the first line and one option per line under it. Put `*` before the correct option and `=` before an optional explanation, and leave a blank line between questions.

For ركّبها, upload any picture and pick one of four difficulties (the grid follows the picture's shape, e.g. 2×4 up to 4×8 for a tall poster) or set the rows and columns yourself. Each piece is worth the game's points. Solving it in the fewest possible swaps, plus a few spare moves, gives full marks. Every extra swap takes a little off, down to 30% for any finished picture.

### Scores, points and the leaderboard

- The browser sends the student's answers. The server re-scores them, checks the attempt limit and saves the attempt with the service role key. Students can't write attempts directly.
- A student's points are the sum of their best score in each game, so replaying a game can only raise it.
- The weekly leaderboard starts on Saturday (Cairo time). Students with no points aren't ranked.
- Contests accept answers only between their start and end (plus 5 minutes for students who started just before the end), and only one attempt per student.
- Admin play is never saved, so admins can test any game freely.

The correct answers are part of the game data sent to the browser, so the game can give instant feedback. A determined student could read them with developer tools, so treat scores as practice, not exams.

### Pages

| Path | Page |
| --- | --- |
| `/` | Landing page |
| `/grades` | Today's quote, then pick a grade |
| `/grades/[slug]` | Sign-up call for visitors; the grade's games (with filters) for students |
| `/wheel` | The student's home: spin the wheel |
| `/play/[slug]` | Play a game and see the result |
| `/quick`, `/contests`, `/tips`, `/videos`, `/daily` | The wheel sections (see above) |
| `/try` | A few sample games without an account |
| `/leaderboard` | لوحة الشرف |
| `/me` | Profile, badges, history, change grade/track or password |
| `/admin` | Dashboard: the wheel sections, students, grades and tracks, quotes |

## Project layout

```
app/                 routes (site pages in app/(site), dashboard in app/admin)
components/games/    game shell, result screen, players and editors for the 9 types
components/admin/    dashboard components (game form, managers, tables)
lib/games/           game registry: schemas, scoring and defaults per type
lib/actions/         server actions (auth, play, admin)
supabase/            migrations, seed and local CLI config
legacy/              the original static site
```

`npm run typecheck` checks the TypeScript, and `npm run build` makes a production build.

## Deploying

Deploy to Vercel (or any Node host). Add the four environment variables, and add the production URL to Supabase's URL configuration.
