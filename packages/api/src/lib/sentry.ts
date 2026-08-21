import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: "https://5f4fad8ac88860d8be0e713a1787e3b0@o4510548617265152.ingest.us.sentry.io/4510548618117120",
  tracesSampleRate: 1.0,
  debug: false,
  environment: process.env.NETLIFY_CONTEXT || process.env.NODE_ENV || "development",
});

export { Sentry };
