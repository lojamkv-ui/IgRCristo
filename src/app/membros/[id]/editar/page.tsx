import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft } from "@/components/icons";
import { MemberForm } from "@/components/MemberForm";
import { PageHeader } from "@/components/ui/primitives";
import { getMember } from "@/lib/repo";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = Number((await params).id);
  const member = Number.isInteger(id) ? await getMember(id) : null;
  return { title: member ? `Editar · ${member.name}` : "Editar membro" };
}

export default async function EditMemberPage({ params }: Props) {
  await ensureSeed();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const member = await getMember(id);
  if (!member) notFound();

  return (
    <>
      <PageHeader
        title={`Editar · ${member.name}`}
        description="Toda alteração é comparada com o registro anterior e gravada no histórico do cadastro."
        breadcrumb={
          <Link href={`/membros/${member.id}`} className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-brand-700">
            <IconArrowLeft size={13} />
            Ficha do membro
          </Link>
        }
      />
      <MemberForm mode="edit" memberId={member.id} member={member} />
    </>
  );
}
