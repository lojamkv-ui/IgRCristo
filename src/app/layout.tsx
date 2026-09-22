import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Shell } from "@/components/Shell";
import { ToastProvider } from "@/components/ui/Toast";
import { DEFAULT_CHURCH, getSettings } from "@/lib/church";

export const metadata: Metadata = {
  title: {
    default: "Renascendo em Cristo · Gestão de Membros e Agenda",
    template: "%s · Renascendo em Cristo",
  },
  description:
    "Sistema completo de gestão de membros (com foto, cargos eclesiásticos e locais, parentesco e histórico de alterações) e agenda de cultos com geração de flyer.",
  applicationName: "Gestão Eclesiástica",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#150f31",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  let churchName = DEFAULT_CHURCH.churchName;

  try {
    const settings = await getSettings();
    churchName = settings.churchName;
  } catch {
    // Sem banco disponível no primeiro paint: usa o nome padrão da instituição.
  }

  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@500;600;700;800&display=swap"
        />
      </head>
      <body>
        <ToastProvider>
          <Shell churchName={churchName}>{children}</Shell>
        </ToastProvider>
      </body>
    </html>
  );
}
