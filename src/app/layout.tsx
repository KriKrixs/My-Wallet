import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { ColorSchemeScript } from "@mantine/core";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyWallet PWA - Gestion Budgétaire & Finances",
  description: "Application PWA moderne de gestion budgétaire, enveloppes et charges récurrentes",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/logo.svg",
    shortcut: "/icons/logo.svg",
    apple: "/icons/logo.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MyWallet",
  },
};

export const viewport: Viewport = {
  themeColor: "#101113",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-mantine-color-scheme="dark">
      <head>
        <ColorSchemeScript defaultColorScheme="dark" />
        <link rel="icon" type="image/svg+xml" href="/icons/logo.svg" />
        <link rel="apple-touch-icon" href="/icons/logo.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ backgroundColor: "#0e131f", color: "#f8f9fa" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
