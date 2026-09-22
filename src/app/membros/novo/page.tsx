import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowLeft } from "@/components/icons";
import { MemberForm } from "@/components/MemberForm";
import { PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Novo membro" };
export const dynamic = "force-dynamic";

export default function NewMemberPage() {
  return (
    <>
      <PageHeader
        title="Novo cadastro de membro"
        description="Preencha os dados pessoais, contatos e cargos. O sistema registra automaticamente a criação no histórico."
        breadcrumb={
          <Link href="/membros" className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-brand-700">
            <IconArrowLeft size={13} />
            Membros
          </Link>
        }
      />
      <MemberForm mode="create" />
    </>
  );
}
