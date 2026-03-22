import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClerkProvider>
          <Navbar />
          <main>{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}
