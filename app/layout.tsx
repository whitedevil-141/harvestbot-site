import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// @ts-ignore: allow side-effect import of global CSS without type declarations
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Harvest Bot – Clash of Clans Farming Bot",
  description:
    "Harvest Bot is a Clash of Clans automation tool that farms gold and elixir, upgrades walls, and runs your base 24/7 automatically.",
  keywords: [
    "clash of clans bot",
    "coc farming bot",
    "clash of clans auto farm",
    "builder base bot",
    "coc automation tool"
  ],
  openGraph: {
    title: "Clash of Clans Farming Bot – Harvest Bot",
    description:
      "Auto farm resources, upgrade walls, and run your base 24/7.",
    url: "https://harvestbot.app",
    siteName: "HarvestBot",
    images: [
      {
        url: "https://harvestbot.app/og.png",
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8331460851365957"
          crossOrigin="anonymous"></script>
      </head>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
