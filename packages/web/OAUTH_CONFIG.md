# OAuth Provider Configuration

This app supports Google and Apple Sign-In. Providers can be enabled or disabled via environment variables.

## Configuration

### Google OAuth (Recommended)

**To enable Google Sign-In:**

1. Set the following environment variables in your `.env.local` file:
```bash
NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true
```

2. Configure Google OAuth credentials in your API environment (see API docs)

**To disable Google Sign-In:**
- Remove the env var or set it to `false`:
```bash
NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=false
```

### Apple OAuth

**To enable Apple Sign-In:**

1. Set the following environment variable:
```bash
NEXT_PUBLIC_APPLE_OAUTH_ENABLED=true
```

2. Configure Apple OAuth credentials in your API environment (see API docs)

**Note:** Apple OAuth is disabled by default. You must explicitly enable it.

## Default Behavior

- **Google**: Enabled if `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED` is set to any value (except "false")
- **Apple**: Disabled by default, only enabled if `NEXT_PUBLIC_APPLE_OAUTH_ENABLED=true`

## Example Configuration

**Enable only Google:**
```bash
NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true
# Don't set NEXT_PUBLIC_APPLE_OAUTH_ENABLED (or set to false)
```

**Enable both:**
```bash
NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true
NEXT_PUBLIC_APPLE_OAUTH_ENABLED=true
```

**Disable all OAuth (magic link only):**
```bash
NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=false
NEXT_PUBLIC_APPLE_OAUTH_ENABLED=false
```

## Notes

- Environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- Changes require a rebuild of the Next.js app
- The login page will automatically show/hide OAuth buttons based on configuration

