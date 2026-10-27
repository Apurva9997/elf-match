import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import Script from "next/script";
import { Toaster } from "sonner";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://elfmatch.com"),
  title: {
    default:
      "ElfMatch - Free Secret Santa Generator & Gift Exchange Organizer",
    template: "%s | ElfMatch",
  },
  description:
    "Create your free Secret Santa gift exchange in 2 minutes. Organize office parties, family exchanges & friend groups with wishlists, exclusion rules & automatic matching. No signup required to start!",
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
  authors: [{ name: "ElfMatch" }],
  creator: "ElfMatch",
  publisher: "ElfMatch",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://elfmatch.com",
    siteName: "ElfMatch",
    title:
      "ElfMatch - Free Secret Santa Generator & Gift Exchange Organizer",
    description:
      "Create your free Secret Santa gift exchange in 2 minutes. Wishlists, exclusion rules & automatic matching included!",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ElfMatch - Free Secret Santa Generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ElfMatch - Free Secret Santa Generator",
    description:
      "Create your free Secret Santa gift exchange in 2 minutes. Wishlists, exclusion rules & automatic matching included!",
    images: ["/og-image.png"],
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
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
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
    </ClerkProvider>
  );
}
