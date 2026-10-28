# 🎄 Secret Santa

A modern, invitation-based Secret Santa platform where teams can organize gift exchanges with a delightful, festive user experience.

![Secret Santa](https://img.shields.io/badge/Node.js-20+-green) ![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue) ![Next.js](https://img.shields.io/badge/Next.js-14-black)

## ✨ Features

- **Team Management** - Create teams and invite members via email
- **Wishlists** - Share what you'd love to receive with links and descriptions
- **Magic Matching** - Fair, random Secret Santa assignments with exclusion rules
- **Address Collection** - Secure shipping address management
- **Gift Tracking** - Track gift status from pending to delivered
- **Beautiful UI** - "Cozy Winter Night" aesthetic with glassmorphism and warm accents
- **Passwordless Auth** - Secure magic link authentication

## 🏗️ Architecture

```
secret-santa/
├── packages/
│   ├── api/          # AWS Lambda + Serverless + Drizzle ORM
│   └── web/          # Next.js 14 + TailwindCSS + Framer Motion
└── package.json      # pnpm workspaces root
```

### Tech Stack

| Layer    | Technology                                       |
| -------- | ------------------------------------------------ |
| Frontend | Next.js 14, React 18, TailwindCSS, Framer Motion |
| API      | AWS Lambda, Serverless Framework, TypeScript     |
| Database | PostgreSQL with Drizzle ORM                      |
| Auth     | Magic Links (passwordless) with JWT              |
| Email    | AWS SES                                          |

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL database
- AWS account (for deployment)

### Installation

1. **Clone and install dependencies:**

```bash
cd secret-santa
pnpm install
```

2. **Set up environment variables:**

For the API (`packages/api/.env`):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/secret_santa
JWT_SECRET=your-super-secret-jwt-key-change-in-production
ENCRYPTION_SECRET=your-32-char-encryption-secret-key
ENCRYPTION_SALT=your-unique-salt-value
FRONTEND_URL=http://localhost:3000
SES_FROM_EMAIL=noreply@yourdomain.com
AWS_REGION=ap-south-1
STAGE=dev
```

> ⚠️ **Security Note**: The `ENCRYPTION_SECRET` is used to encrypt sensitive data like shipping addresses. Use a strong, random 32+ character string. Never commit this to version control!

For the Web (`packages/web/.env.local`):

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

3. **Set up the database:**

```bash
# Create the database
createdb secret_santa

# Push the schema
pnpm db:push
```

4. **Start development servers:**

```bash
# Start both API and Web
pnpm dev

# Or start them separately:
pnpm dev:api  # API on http://localhost:3001
pnpm dev:web  # Web on http://localhost:3000
```

## 📊 Database Schema

The app uses the following main tables:

- `users` - User accounts
- `teams` - Secret Santa groups
- `team_members` - Team memberships with roles
- `wishlists` & `wish_items` - Gift wishlists
- `addresses` - Shipping addresses
- `assignments` - Secret Santa pairings
- `exclusions` - Matching exclusion rules
- `magic_links` - Passwordless auth tokens

Run `pnpm db:studio` to explore the database with Drizzle Studio.

## 🔐 Permission Model

| Action                         | Admin | Member |
| ------------------------------ | ----- | ------ |
| Create/Edit team settings      | ✅    | ❌     |
| Invite/Remove members          | ✅    | ❌     |
| Trigger assignments            | ✅    | ❌     |
| Set exclusion rules            | ✅    | ❌     |
| Edit own wishlist              | ✅    | ✅     |
| Edit own address               | ✅    | ✅     |
| View own assignment            | ✅    | ✅     |
| View giftee's wishlist/address | ✅    | ✅     |

## 🔒 Security

### Data Encryption

Sensitive data is encrypted at rest using AES-256-GCM encryption:

| Data               | Encrypted | Notes                             |
| ------------------ | --------- | --------------------------------- |
| Shipping addresses | ✅        | Street, city, state, postal code  |
| Country            | ❌        | Needed for shipping logistics     |
| Email addresses    | ❌        | Needed for authentication lookups |
| Wishlist items     | ❌        | Not considered PII                |
| User names         | ❌        | Display purposes                  |

### Authentication

- **Passwordless**: Magic link authentication (no passwords to leak)
- **JWT tokens**: Short-lived access tokens (7 days) with refresh tokens (30 days)
- **Secure cookies**: HttpOnly, Secure, SameSite attributes

### Best Practices

1. Always use HTTPS in production
2. Store secrets in environment variables or AWS Secrets Manager
3. Rotate `ENCRYPTION_SECRET` periodically (requires re-encryption of data)
4. Use strong, unique values for `JWT_SECRET` and `ENCRYPTION_SECRET`

## 🎨 Design System

The app uses a "Cozy Winter Night" aesthetic:

- **Colors**: Deep midnight blues, warm gold accents, cream text
- **Typography**: Playfair Display (headings), DM Sans (body), JetBrains Mono (code)
- **Effects**: Glassmorphism cards, soft glow effects, smooth animations

## 📡 API Endpoints

### Authentication

- `POST /auth/magic-link` - Send magic link email
- `POST /auth/verify` - Verify magic link
- `POST /auth/refresh` - Refresh JWT token
- `GET /auth/me` - Get current user

### Teams

- `POST /teams` - Create team
- `GET /teams` - List user's teams
- `GET /teams/:id` - Get team details
- `PATCH /teams/:id` - Update team
- `DELETE /teams/:id` - Delete an exchange that has not been drawn
- `POST /teams/:id/archive` - Archive an exchange and take it off the active list
- `DELETE /user/account` - Delete the signed-in account and its Clerk record
- `POST /teams/:id/assign` - Trigger assignments

### Invitations

- `POST /teams/:id/invite` - Invite members by email
- `POST /teams/:id/invite-link` - Create or replace the shareable invite link
- `DELETE /teams/:id/invite-link` - Turn the shareable invite link off
- `POST /invitations/:token/accept` - Accept invitation
- `POST /invitations/:token/decline` - Decline invitation

### Wishlists & Addresses

- `GET/PUT /teams/:id/wishlist` - Manage wishlist
- `GET/PUT /teams/:id/address` - Manage address
- `GET /teams/:id/giftee/wishlist` - Get giftee's wishlist
- `GET /teams/:id/giftee/address` - Get giftee's address

## 🚢 Deployment

### API (AWS Lambda)

```bash
cd packages/api

# Deploy to dev
pnpm deploy

# Deploy to production
pnpm deploy:prod
```

### Web (Vercel)

Connect your repository to Vercel and set the following:

- Root Directory: `packages/web`
- Build Command: `pnpm build`
- Environment Variables: `NEXT_PUBLIC_API_URL`

## 📝 License

MIT

---

Made with ❤️ for the holiday season 🎄
