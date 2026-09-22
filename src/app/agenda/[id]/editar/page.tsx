import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft } from "@/components/icons";
import { ServiceForm } from "@/components/ServiceForm";
import { PageHeader } from "@/components/ui/primitives";
import { formatDateBR } from "@/lib/format";
import { getService, listMembers } from "@/lib/repo";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = Number((await params).id);
  const service = Number.isInteger(id) ? await getService(id) : null;
  return { title: service ? `Editar · ${service.title}` : "Editar culto" };
}

export default async function EditServicePage({ params }: Props) {
  await ensureSeed();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const service = await getService(id);
  if (!service) notFound();

  const members = await listMembers({ sort: "name" });

  return (
    <>
      <PageHeader
        title={`Editar · ${service.title}`}
        description={`Culto de ${formatDateBR(service.serviceDate)}. Ajuste a escala e gere um novo flyer quando concluir.`}
        breadcrumb={
          <Link href="/agenda" className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-brand-700">
            <IconArrowLeft size={13} />
            Agenda
          </Link>
        }
      />
      <ServiceForm mode="edit" serviceId={service.id} service={service} members={members} />
    </>
  );
}
