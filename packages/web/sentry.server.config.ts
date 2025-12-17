import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://5f4fad8ac88860d8be0e713a1787e3b0@o4510548617265152.ingest.us.sentry.io/4510548618117120",

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
  // We recommend adjusting this value in production.
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
