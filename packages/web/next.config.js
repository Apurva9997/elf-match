const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withSentryConfig(nextConfig, {
  org: "apoorv-khandelwal",
  project: "javascript-nextjs",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  reactComponentAnnotation: {
    enabled: true,
  },
  hideSourceMaps: true,
  disableLogger: true,
  // Skip source map uploads when no auth token is present (e.g. Netlify builds
  // without SENTRY_AUTH_TOKEN configured) — prevents non-zero exit in CI.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
