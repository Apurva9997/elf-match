"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-midnight">
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-cream mb-4">
              Something went wrong!
            </h2>
            <p className="text-cream/70 mb-6">
              We apologize for the inconvenience. Please try again.
            </p>
            <button
              onClick={() => reset()}
              className="px-6 py-3 bg-gold text-midnight font-semibold rounded-lg hover:bg-gold/90 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
