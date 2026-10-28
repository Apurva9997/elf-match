# Testing Elf Match

Use this when visually testing the app, reproducing a bug in the browser, creating a Clerk user, or running the app locally.

Production and development are separate. A test is finished only when the app it exercised was the development app, and the database it wrote was the development database.

## Production, do not write

- Site: https://elfmatch.com
- Deploys from `main` to the Netlify site `transcendent-raindrop-058d5a`.
- Clerk application `elfmatch` (`app_your_clerk_application`), production instance `ins_your_production_instance`. Sign-in is Google.
- Database host: `your-project-pooler.region.aws.neon.tech`, database `giftwhisper`.

`packages/api/.env` and `packages/web/.env.local` point here. Leave those files pointing here. Do not run `drizzle-kit push` against this host.

The Google accounts `redacted@example.com` and `redacted@example.com` are the same person and already have live exchanges. Use them only when the user asked for a production check. Do not invite, draw, or delete on those exchanges.

## Development

- App: http://localhost:3000
- Clerk development instance: `ins_your_development_instance`
- Publishable key starts with `pk_test_`. Account host: `your-instance.accounts.dev`
- Database host: `ep-dawn-wind-a1evr80p-pooler.ap-southeast-1.aws.neon.tech`, database `neondb`

The development database URL is in `packages/api/.env.development`, which is gitignored. If that file is missing, ask the user for it. Do not copy the URL from `packages/api/.env`.

Before any write, the connection string host is `ep-dawn-wind-a1evr80p`.

Email-code sign-in is enabled on the development instance only. Its paths are `/auth/login` and `/dashboard`, and `http://localhost:3000` is an allowed origin. Do not change the production Clerk instance.

## Create a user

The Clerk CLI is already authenticated. From the repo:

```bash
clerk whoami
clerk link --app app_your_clerk_application
clerk users list --instance dev
```

Pass `--instance dev` on every user and impersonation command. A missing instance can target production.

Reuse these development users before creating another:

| Name | Email | Clerk user |
| --- | --- | --- |
| Mira Shah | mira.qa.elfmatch+dev@example.com | user_development_one |
| Dev Kapoor | dev.qa.elfmatch+dev@example.com | user_development_two |
| Rhea Nair | rhea.qa.elfmatch+dev@example.com | user_development_three |
| Arun Mehta | arun.qa.elfmatch+dev@example.com | user_development_four |

Create another only when the flow needs a person who has never joined:

```bash
clerk users create --instance dev \
  --email <name>.qa.elfmatch+dev@example.com \
  --first-name <Name> --last-name <Surname> --yes
```

Keep the `qa.elfmatch+dev@example.com` address shape so the account is obvious in the development database. The new user's email is verified by Clerk. Password sign-in is off, so do not set or store a password.

Done when `clerk users list --instance dev` shows the account, and the command included `--instance dev`.

## Sign in as that user

The login page does not accept a Clerk ticket. Do not add ticket handling in order to test.

1. `clerk impersonate <email> --instance dev --print --yes` prints a ticket URL on `your-instance.clerk.accounts.dev`.
2. Open that URL with a GET. It redirects to `https://your-instance.accounts.dev/sign-in?__clerk_ticket=...`.
3. Open the sign-in URL in the browser, then open http://localhost:3000/dashboard.

The accounts page sets the development-browser cookie that localhost needs. A direct request to `/dashboard/teams/:id` before that cookie exists redirects to login with `x-clerk-auth-reason: dev-browser-missing`. Load the dashboard first, then follow the exchange link.

If the accounts page says it cannot redirect to the application, allow the origin once with the development secret from `clerk env pull --instance dev`:

```bash
curl -X PATCH https://api.clerk.com/v1/instance \
  -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"allowed_origins":["http://localhost:3000"]}'
```

Do not print or commit the secret.

Done when the dashboard shows the development user's name.

## Run the app

The API is the Next.js route at `/api`. There is no separate API server to start. The browser calls `/api` on the same origin.

Node 20 or newer is required. Confirm `node -v` before starting; an older Node fails inside `pnpm`.

Next.js loads `packages/web/.env.local` over the shell. For the run, move that file aside and write a temporary one. Restore the original when the run ends.

The temporary file needs:

- `DATABASE_URL` from `packages/api/.env.development`
- `FRONTEND_URL=http://localhost:3000`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` from `clerk env pull --instance dev`
- `ENCRYPTION_SECRET` and `ENCRYPTION_SALT` copied from `packages/api/.env`, so an address saved by the app can be read back
- `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=false`

`drizzle-kit` reads `packages/api/.env` and does not override a `DATABASE_URL` already in the shell. Export the development URL before a schema push. A push without that export writes to production.

Start the app from `packages/web`:

```bash
pnpm exec next dev --port 3000
```

Done when the homepage HTML contains `pk_test_` and does not contain `pk_live_`, and a query to the dawn-wind database is the one the app is using.

In development, invitation and assignment mail is printed in the Next.js log instead of sent. The invitation URL is in that log. The organizer can also copy a shareable invite link from People on the exchange. That link is not in the log.

## Browser pass

Use the Browser Use CLI. Read `~/.grok/skills/browser-use/SKILL.md` first. The first navigation is `new_tab`. Leave tabs you did not open.

A hidden tab can leave the exchange page blank. Activate the tab before judging it. Check a layout change at 1440px wide and at 390px wide. Use the control; a screenshot of the first paint is not a pass.

Cover, as the user asked:

- Signed out: home, how it works, what you can set, questions.
- Signed in as Mira: create an exchange, invite the other development users, confirm the pending row and the joined count, add a wishlist item, save an address, add an exclusion, and generate an assignment preview.
- Signed in as a second development user: open the invitation from the dev log, join, and see only what that person should see.

## Stop before these actions

- Do not invite an address outside `qa.elfmatch+dev@example.com` unless the user asked.
- Do not confirm a draw. Confirmation emails every member and locks the assignments.
- Do not delete an exchange unless the user asked. Studio December (`00000000-0000-0000-0000-000000000001`) is a development fixture. Leave it.

A shared address and no per-person wishlist progress are known product gaps. Record a gap when the user asked for findings. Do not treat the gap as a bug to fix unless the user asked for that change.

## Record a bug

The board is https://trello.com/b/your_trello_board/elf-match-qa. The Bugs list id is `your_trello_list`. The user is signed in to Trello in Chrome.

The board's "Add a card" composer drops the title. Create the card from `https://trello.com/add-card?idList=your_trello_list`, choose Elf Match QA, then the Bugs list. Open the card and add a comment with what happened, the account, the URL, and what should have happened. Attach the screenshot.

## Leave the repo as you found it

Restore `packages/web/.env.local`. Stop the Next.js process. `git status` shows no env file.
