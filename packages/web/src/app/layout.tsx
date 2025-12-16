import type { Metadata } from "next";
import Script from "next/script";
import { Toaster } from "sonner";
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
          src="https://cdn.amplitude.com/script/cafdae686221fc101d72a883c8f95324.js"
          strategy="beforeInteractive"
        />
        <Script
          id="amplitude-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.amplitude.add(window.sessionReplay.plugin({sampleRate: 1}));
              window.amplitude.init('cafdae686221fc101d72a883c8f95324', {
                fetchRemoteConfig: true,
                autocapture: {
                  attribution: true,
                  fileDownloads: true,
                  formInteractions: true,
                  pageViews: true,
                  sessions: true,
                  elementInteractions: true,
                  networkTracking: true,
                  webVitals: true,
                  frustrationInteractions: true
                }
              });
            `,
          }}
        />
        <Providers>
          {/* Background gradient */}
          <div className="fixed inset-0 bg-gradient-radial from-midnight-50 via-midnight to-midnight -z-10" />

          {/* Subtle glow effect */}
          <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-glow -z-10 opacity-50" />

          {children}

          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#1a1f2e",
                border: "1px solid rgba(212, 175, 55, 0.2)",
                color: "#f5f0e8",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
