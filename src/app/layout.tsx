import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Newsreader, Schibsted_Grotesk } from "next/font/google";
import { Nav } from "@/components/nav";
import "./globals.css";

const schibsted = Schibsted_Grotesk({ variable: "--font-schibsted", subsets: ["latin"] });
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], axes: ["opsz"], style: ["normal", "italic"] });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: "Leash", template: "%s · Leash" },
  description: "Let an AI agent shop with your PayPal wallet, within rules you set.",
};

export const viewport: Viewport = {
  themeColor: "#f7f5f0",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${schibsted.variable} ${newsreader.variable} ${plexMono.variable} antialiased`}>
      <body className="min-h-dvh">
        <Nav />
        <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-32 sm:px-8 sm:pt-10 md:pb-20">{children}</main>
      </body>
    </html>
  );
}
