import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowLeft } from "@/components/icons";
import { SettingsForm } from "@/components/SettingsForm";
import { PageHeader } from "@/components/ui/primitives";
import { getSettings } from "@/lib/church";

export const metadata: Metadata = { title: "Configurações" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <>
      <PageHeader
        title="Configurações da igreja"
        description="Dados institucionais usados nos flyers, identidade visual e rotinas de backup."
        breadcrumb={
          <Link href="/" className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-brand-700">
            <IconArrowLeft size={13} />
            Painel
          </Link>
        }
      />
      <SettingsForm settings={settings} />
    </>
  );
}
