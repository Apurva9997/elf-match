import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Secret Santa | Gift Exchange Made Magical",
  description:
    "Organize your Secret Santa gift exchange with ease. Create teams, make wishlists, and spread holiday joy!",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Script
          src="https://cdn.amplitude.com/libs/analytics-browser-2.11.1-min.js.gz"
          strategy="afterInteractive"
        />
        <Script
          src="https://cdn.amplitude.com/libs/plugin-session-replay-browser-1.25.0-min.js.gz"
          strategy="afterInteractive"
        />
        <Script
          id="amplitude-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if (window.amplitude && window.sessionReplay) {
                window.amplitude.add(window.sessionReplay.plugin({sampleRate: 1}));
                window.amplitude.init('cafdae686221fc101d72a883c8f95324', {
                  autocapture: {
                    elementInteractions: true
                  }
                });
              }
            `,
          }}
        />
        <Providers>
          {/* Background gradient */}
          <div className="fixed inset-0 bg-gradient-radial from-midnight-50 via-midnight to-midnight -z-10" />

          {/* Subtle glow effect */}
          <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-glow -z-10 opacity-50" />

          {children}
        </Providers>
      </body>
    </html>
  );
}
