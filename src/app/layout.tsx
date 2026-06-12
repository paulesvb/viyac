import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { ClerkRootProvider } from "@/components/ClerkRootProvider";
import { NavbarWrapper } from "@/components/NavbarWrapper";
import { DocumentLang } from "@/components/DocumentLang";
import { ConsoleBrand } from "@/components/ConsoleBrand";
import { SiteFooter } from "@/components/SiteFooter";
import { getSiteUrl } from "@/lib/site-url";

/** Clerk session + `ADMIN_CLERK_USER_ID` must run per request so the Admin link is correct. */
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/** Matches `globals.css` dark `--background` (~ zinc-950) for browser chrome. */
export const viewport: Viewport = {
  themeColor: '#0c0c0c',
  colorScheme: 'dark',
};

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: 'VIYAC | Official Site',
  description: 'Hybrid Soul artist Viyac blending human composition with AI vocal synthesis. New music February 2026.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: 'VIYAC - The Future of Hybrid Soul',
    description: 'Hybrid Soul artist Viyac blending human composition with AI vocal synthesis. New music February 2026.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VIYAC | Official Site',
    description: 'Hybrid Soul artist Viyac blending human composition with AI vocal synthesis.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-dvh flex-col antialiased`}
      >
        <Suspense fallback={null}>
          <ClerkRootProvider>
            <DocumentLang />
            <NavbarWrapper />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </ClerkRootProvider>
        </Suspense>
        <Analytics />
        <ConsoleBrand />
      </body>
    </html>
  );
}
