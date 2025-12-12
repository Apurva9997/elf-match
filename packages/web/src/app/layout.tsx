import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Secret Santa | Gift Exchange Made Magical',
  description: 'Organize your Secret Santa gift exchange with ease. Create teams, make wishlists, and spread holiday joy!',
  icons: {
    icon: '/favicon.ico',
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

