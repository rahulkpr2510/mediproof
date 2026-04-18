import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display, DM_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";
import { WalletProvider } from "./components/wallet/WalletProvider";
import { AppShell } from "./components/layout/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "MediProof — Verify Medicine Authenticity Instantly",
  description:
    "MediProof uses blockchain and unit-level QR codes to verify medicine authenticity across the supply chain. Scan any QR for a GREEN, AMBER, or RED trust verdict in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#fafafa",
          colorBackground: "#18181b",
          colorInputBackground: "#27272a",
          colorInputText: "#fafafa",
        },
      }}
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} ${dmSans.variable} h-full antialiased`}
      >
        <body className="min-h-full bg-zinc-950 text-zinc-50">
          <WalletProvider>
            <AppShell>{children}</AppShell>
          </WalletProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
