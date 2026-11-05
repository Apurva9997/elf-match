import type { Metadata } from "next";
import Script from "next/script";
import { shareImage } from "@/lib/share";
import "./globals.css";

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
    locale: "en",
    url: "https://elfmatch.com",
    siteName: "Elf Match",
    title: "Elf Match — organize a Secret Santa exchange",
    description:
      "Set a budget and date, invite people by link or email, collect wishlists, and send private assignments.",
    images: [shareImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Elf Match — organize a Secret Santa exchange",
    description:
      "Set a budget and date, invite people by link or email, collect wishlists, and send private assignments.",
    images: [shareImage],
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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://video.gumlet.io" />
        <link
          rel="preload"
          as="image"
          href="/film/someone-gets-to-be-your-santa.jpg"
          fetchPriority="high"
        />
      </head>
      <body className="min-h-screen">
        <Script
          src="https://analytics.ahrefs.com/analytics.js"
          data-key="u0RRy0IkQmdhl4Pwds0Clw"
          strategy="lazyOnload"
        />
        <Script
          id="amplitude-sdk"
          src="https://cdn.amplitude.com/script/cafdae686221fc101d72a883c8f95324.js"
          strategy="lazyOnload"
        />
        <Script
          id="amplitude-init"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                function start() {
                  if (!window.amplitude || !window.amplitude.init) return;
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
                }
                if (window.amplitude && window.amplitude.init) start();
                else document.getElementById("amplitude-sdk")?.addEventListener("load", start);
              })();
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}
