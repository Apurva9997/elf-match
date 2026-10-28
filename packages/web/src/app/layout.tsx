import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://elfmatch.com"),
  other: {
    "ahrefs-site-verification":
      "c896ed64b5c7ab5adfaa14a4b152385cd29aaf3f73a00ec1df6e0e8051b78e2f",
  },
  title: {
    default: "Elf Match — organize a Secret Santa exchange",
    template: "%s | Elf Match",
  },
  description:
    "Set a budget and date, invite people by link or email, collect wishlists, keep particular pairs from matching, and send private gift assignments.",
  keywords: [
    "secret santa",
    "secret santa generator",
    "gift exchange",
    "gift exchange organizer",
    "secret santa online",
    "free secret santa",
    "office secret santa",
    "family gift exchange",
    "holiday gift exchange",
    "christmas gift exchange",
    "secret santa app",
    "gift exchange app",
    "wishlist maker",
    "secret santa with exclusions",
  ],
  authors: [{ name: "Elf Match" }],
  creator: "Elf Match",
  publisher: "Elf Match",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://elfmatch.com",
    siteName: "Elf Match",
    title: "Elf Match — organize a Secret Santa exchange",
    description:
      "Set a budget and date, invite people by link or email, collect wishlists, and send private assignments.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Elf Match — an example gift exchange invitation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Elf Match — organize a Secret Santa exchange",
    description:
      "Set a budget and date, invite people by link or email, collect wishlists, and send private assignments.",
    images: ["/twitter-image"],
    creator: "@elfmatch",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  alternates: {
    canonical: "https://elfmatch.com",
  },
  verification: {
    // Add these after setting up Google Search Console
    google: "SYoTE1FiGUmdNlO6Kk6B9Ex7Lc9tvNfaZjFZzM_0ldI",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
    <html lang="en-IN">
      <body className="min-h-screen">
        <Script
          src="https://analytics.ahrefs.com/analytics.js"
          data-key="u0RRy0IkQmdhl4Pwds0Clw"
          strategy="beforeInteractive"
        />
        <Script
          src="https://cdn.amplitude.com/script/cafdae686221fc101d72a883c8f95324.js"
          strategy="afterInteractive"
        />
        <Script
          id="amplitude-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var path = location.pathname;
                var privateSurface = path.indexOf("/dashboard") === 0 || path.indexOf("/invite/") === 0;
                if (!privateSurface && window.sessionReplay) {
                  window.amplitude.add(window.sessionReplay.plugin({
                    sampleRate: 0.1,
                    privacyConfig: { defaultMaskLevel: "conservative" }
                  }));
                }
                window.amplitude.init('cafdae686221fc101d72a883c8f95324', {
                  fetchRemoteConfig: false,
                  autocapture: {
                    attribution: true,
                    fileDownloads: true,
                    formInteractions: false,
                    pageViews: true,
                    sessions: true,
                    elementInteractions: false,
                    networkTracking: false,
                    webVitals: true,
                    frustrationInteractions: false
                  }
                });
              })();
            `,
          }}
        />
        <Providers>
          {children}

          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "#FFFCF6",
                border: "1px solid #DDD4C4",
                color: "#1C1915",
              },
            }}
          />
        </Providers>
      </body>
    </html>
    </ClerkProvider>
  );
}
