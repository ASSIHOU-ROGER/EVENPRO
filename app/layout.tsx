import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["500", "600", "700", "800", "900"],
});

const wisteria = localFont({
  src: [
    { path: "./fonts/Wisteria.woff", weight: "400", style: "normal" },
    { path: "./fonts/Wisteria.ttf", weight: "400", style: "normal" },
  ],
  variable: "--font-wisteria",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  title: "EventPro — Gestion d'événements et billetterie",
  description: "Créez vos événements, vendez des billets et contrôlez l'accès avec EventPro.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${outfit.variable} ${wisteria.variable}`}>
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
