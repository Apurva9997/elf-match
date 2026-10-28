const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/((?!dashboard|auth|invite|api).*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
  experimental: {
    // Compile the API package sitting next to this app in the monorepo.
    externalDir: true,
    serverComponentsExternalPackages: ["pg"],
  },
  webpack: (config) => {
    // packages/api is ESM TypeScript that imports sibling files as ".js".
    config.resolve.extensionAlias = {
      ".js": [".ts", ".js"],
    };
    return config;
  },
};

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: "elf-match",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  reactComponentAnnotation: {
    enabled: true,
  },
  hideSourceMaps: true,
  disableLogger: true,
  // Skip source map uploads when no auth token is present — prevents
  // non-zero exit in Netlify CI when SENTRY_AUTH_TOKEN is not configured.
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
