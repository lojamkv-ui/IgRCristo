import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Outfit } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const sans = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Renascendo · Gestão da Sede",
    template: "%s · Renascendo",
  },
  description: "Cadastro de membros, cargos, parentesco, histórico e agenda de cultos da Igreja Renascendo em Cristo, em Trindade/GO.",
  icons: { icon: "/brand/emblem.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#3a121c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${sans.variable}`}>
      <body className={sans.className}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
