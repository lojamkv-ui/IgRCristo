import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowLeft } from "@/components/icons";
import { ServiceForm } from "@/components/ServiceForm";
import { PageHeader } from "@/components/ui/primitives";
import { listMembers } from "@/lib/repo";
import { ensureSeed } from "@/lib/seed";

export const metadata: Metadata = { title: "Agendar culto" };
export const dynamic = "force-dynamic";

export default async function NewServicePage() {
  await ensureSeed();
  const members = await listMembers({ sort: "name" });

  return (
    <>
      <PageHeader
        title="Agendar culto"
        description="Informe data, hora e a equipe ministerial. As fotos do pregador e dos cantores são usadas no flyer."
        breadcrumb={
          <Link href="/agenda" className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-brand-700">
            <IconArrowLeft size={13} />
            Agenda
          </Link>
        }
      />
      <ServiceForm mode="create" members={members} />
    </>
  );
}
