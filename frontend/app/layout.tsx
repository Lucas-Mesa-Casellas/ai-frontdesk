import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { getLocale } from "@/lib/locale";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
}); 
 
export const metadata: Metadata = {
  metadataBase: new URL("https://lmcagents.app"),
  title: "LMC Agents",
  description:
    "LMC Agents answers every call, understands what the caller needs, acts on it, then tells you what happened. Day and night.",
  openGraph: {
    title: "LMC Agents",
    description:
      "LMC Agents answers every call, understands what the caller needs, acts on it, then tells you what happened.",
    url: "https://lmcagents.app",
    siteName: "LMC Agents",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LMC Agents",
    description: "Answers every call, in Spanish, English or French — day and night.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
