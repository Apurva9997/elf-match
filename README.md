# Elf Match

A Secret Santa organizer you can run yourself. People join an exchange, write a wishlist, and receive one private assignment. Couples and other pairs can be kept apart.

The site at [elfmatch.com](https://elfmatch.com) is one deployment of this code. Nothing in this repository is required to use that deployment, and nothing here connects a copy you run to it.

## What you need

- Node.js 20 or newer
- pnpm 9 (`corepack enable && corepack prepare pnpm@9.0.0 --activate`)
- A PostgreSQL database you control. [Neon](https://neon.tech) is the path below. Any Postgres 15 or newer server works the same way.
- A [Clerk](https://clerk.com) application for sign-in. Email codes and Google are both configured in the Clerk dashboard, not in this repo.

Mail and error reporting are optional. Without a mail provider, invitation and assignment messages are printed in the server log in development, and the organizer can copy a join link from the exchange.

## Create the database

1. Create a Neon account and a project. Pick the region closest to where the app will run.
2. Create a database named `elfmatch`. Neon also creates a role and a password. Save the password. You will not see it again.
3. On the project dashboard, open **Connect** and copy the **pooled** connection string. It looks like this, with your own host, role, and password:

```text
postgresql://USER:PASSWORD@ep-example-pooler.region.aws.neon.tech/elfmatch?sslmode=require
```

Use the host that contains `-pooler`. The app keeps a small pool of its own. A direct, unpooled host will exhaust Neon's connection limit under a few concurrent visitors.

Neon presents a public certificate. The app checks that certificate. Leave `sslmode=require` on the URL.

Any other Postgres host works. Create the database, then set `DATABASE_URL` to a URL this process can open. For a database on the same machine:

```text
postgresql://elfmatch:password@localhost:5432/elfmatch
```

## Create sign-in

1. In the [Clerk dashboard](https://dashboard.clerk.com), create an application.
2. Turn on the sign-in methods you want. Email code and Google are enough to start. Apple is off unless you set `NEXT_PUBLIC_APPLE_OAUTH_ENABLED=true`.
3. Under **API keys**, copy the publishable key and the secret key for the development instance.
4. Under **Domains**, allow `http://localhost:3000` as an origin while you run it locally.
5. Set the sign-in and sign-up paths to `/auth/login`. The home page after sign-in is `/dashboard`.

The publishable key is public. It is embedded in the pages the browser loads. The secret key is not. Keep it in an environment file that is not committed.

## Configure this checkout

```bash
pnpm install
cp packages/web/.env.example packages/web/.env.local
```

Edit `packages/web/.env.local`. The Next.js app and the API are the same process, and both read this file.

```env
DATABASE_URL=postgresql://USER:PASSWORD@ep-example-pooler.region.aws.neon.tech/elfmatch?sslmode=require

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key
CLERK_SECRET_KEY=sk_test_your_secret_key

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/login
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

FRONTEND_URL=http://localhost:3000

ENCRYPTION_SECRET=replace-with-32-or-more-random-characters
ENCRYPTION_SALT=replace-with-another-random-value
WISHLIST_SEAL_KEY=replace-with-a-third-random-value

NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=false
```

Generate the three random values and do not reuse them across deployments:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

`ENCRYPTION_SECRET` and `ENCRYPTION_SALT` encrypt shipping addresses. `WISHLIST_SEAL_KEY` seals wishlists. A copy of the database cannot open a wishlist without that third value, even with the other two. Losing any of them makes the data they protect unreadable. There is no recovery path in the app.

Apply the schema to the empty database:

```bash
cd packages/api
pnpm exec drizzle-kit push
```

`drizzle-kit` reads `packages/api/.env`. Either export `DATABASE_URL` in the shell before the command, or put the same URL in `packages/api/.env`. That file is gitignored. Confirm the host in the URL is the database you just created before you run the command.

## Run it

From `packages/web`:

```bash
pnpm exec next dev --port 3000
```

Open http://localhost:3000. Sign-in mail from Clerk goes through Clerk. Invitation and assignment mail from this app is printed in the terminal until you add a mail provider.

To run the production build locally:

```bash
cd packages/web
pnpm build
pnpm start
```

## Optional pieces

| Piece | What it does if you skip it |
| --- | --- |
| Mailgun (`MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `FROM_EMAIL`) | Production has no invitation email. Share the join link from the exchange instead. Development always prints the message. |
| Upstash Redis (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) | Rate limits are not enforced. Requests are allowed. |
| Sentry (`SENTRY_DSN`, and `SENTRY_AUTH_TOKEN` only while building) | Errors are not reported. Leave the DSN unset. |

Set `SENTRY_DSN` to your own project if you want error reports. Do not point it at anyone else's project. `SENTRY_AUTH_TOKEN` is only used to upload source maps at build time. A build without it still succeeds.

## Deploy it yourself

The app is one Next.js server. `packages/web` serves the pages and handles `/api`. There is no separate API process to deploy.

Build a container from the repo root. The publishable key is the only value baked into the image. Everything else is read when the container starts.

```bash
docker build \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_publishable_key \
  -t elfmatch .
```

Run it with the same variables as local development, plus the public origin:

```bash
docker run --rm -p 3000:3000 \
  -e DATABASE_URL='postgresql://USER:PASSWORD@ep-example-pooler.region.aws.neon.tech/elfmatch?sslmode=require' \
  -e CLERK_SECRET_KEY='sk_live_your_secret_key' \
  -e NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY='pk_live_your_publishable_key' \
  -e FRONTEND_URL='https://your-domain.example' \
  -e ENCRYPTION_SECRET='your-secret' \
  -e ENCRYPTION_SALT='your-salt' \
  -e WISHLIST_SEAL_KEY='your-seal-key' \
  elfmatch
```

Put TLS in front of it. `Caddyfile` terminates TLS for https://elfmatch.com and reverse-proxies to the app. A copy you run yourself replaces both hostnames in that file. `compose.public.yaml` runs the app and Caddy together. It reads `/etc/elfmatch.env` on the host. That file is not in this repository. A copy you run yourself points `env_file` at an env file you keep outside the checkout.

In the Clerk dashboard for the production instance, set the allowed origin to your public URL and keep the same sign-in paths.

A push to this repository does not deploy your copy. Hosting, DNS, and the database stay on accounts you control.

## What is stored

| Data | Who can read it |
| --- | --- |
| Name and email | The person, and the organizer of an exchange they have joined |
| Wishlist title, note, and shop link | The person, and the person drawn to give them a gift, after the draw |
| Shipping address | The person, and their giver after the draw. Encrypted at rest |
| The draw | Each person sees only the one name they are buying for |

Country is stored in the clear because shipping needs it. Email is stored in the clear because sign-in looks it up.

## License

MIT
