// The Next.js server function already initializes @sentry/nextjs. Importing
// @sentry/node here loads Sentry 8 into the same process as Sentry 10, and
// the older HTTP integration calls a method the newer client does not have.
// That uncaught exception becomes a 502 after an otherwise successful API call.
import * as Sentry from "@sentry/nextjs";

export { Sentry };
