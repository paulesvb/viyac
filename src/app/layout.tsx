import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

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
  title: 'VIYAC | Official Site',
  description: 'Hybrid Soul artist Viyac blending human composition with AI vocal synthesis. New music February 2026.',
  openGraph: {
    title: 'VIYAC - The Future of Hybrid Soul',
    description: 'Hybrid Soul artist Viyac blending human composition with AI vocal synthesis. New music February 2026.',
    images: ['/og-image.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VIYAC | Official Site',
    description: 'Hybrid Soul artist Viyac blending human composition with AI vocal synthesis.',
    images: ['/og-image.jpg'],
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
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh antialiased`}
      >
        <ClerkProvider appearance={{ baseTheme: dark }}>
          <Navbar />
          <main>{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}
