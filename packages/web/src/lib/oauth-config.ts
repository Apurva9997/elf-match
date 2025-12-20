/**
 * OAuth Provider Configuration
 * 
 * Controls which OAuth providers are enabled in the application.
 * 
 * To enable Google OAuth, set NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true
 * To enable Apple OAuth, set NEXT_PUBLIC_APPLE_OAUTH_ENABLED=true
 * 
 * By default:
 * - Google: Enabled if env var is set (or not set at all - defaults to enabled)
 * - Apple: Disabled unless explicitly set to "true"
 */

export const oauthConfig = {
  google: {
    // Enabled by default, can be disabled by setting to "false"
    enabled: process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED !== "false",
  },
  apple: {
    // Disabled by default, must explicitly enable
    enabled: process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED === "true",
  },
} as const;

/**
 * Get list of enabled OAuth providers
 */
export function getEnabledProviders(): Array<"google" | "apple"> {
  const providers: Array<"google" | "apple"> = [];
  if (oauthConfig.google.enabled) providers.push("google");
  if (oauthConfig.apple.enabled) providers.push("apple");
  return providers;
}

/**
 * Check if any OAuth providers are enabled
 */
export function hasOAuthProviders(): boolean {
  return oauthConfig.google.enabled || oauthConfig.apple.enabled;
}

