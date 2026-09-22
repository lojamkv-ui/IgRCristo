import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowLeft, IconUserPlus } from "@/components/icons";
import { MembersBrowser } from "@/components/MembersBrowser";
import { PageHeader } from "@/components/ui/primitives";
import { getMemberFacets, listMembers } from "@/lib/repo";
import { ensureSeed } from "@/lib/seed";
import type { MemberFilters } from "@/lib/types";

export const metadata: Metadata = { title: "Membros" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value || undefined;
}

export default async function MembersPage({ searchParams }: Props) {
  await ensureSeed();
  const params = await searchParams;

  const filters: MemberFilters = {
    q: readParam(params.q),
    ecclesiastical: readParam(params.ecclesiastical),
    local: readParam(params.local),
    kinship: readParam(params.kinship),
    status: readParam(params.status),
    sort: (readParam(params.sort) as MemberFilters["sort"]) ?? "name",
  };

  const [members, facets] = await Promise.all([listMembers(filters), getMemberFacets()]);

  return (
    <>
      <PageHeader
        title="Cadastro de membros"
        description="Gerencie pessoas, cargos eclesiásticos e locais, parentesco e todo o histórico de alterações."
        breadcrumb={
          <Link href="/" className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-brand-700">
            <IconArrowLeft size={13} />
            Painel
          </Link>
        }
        actions={
          <Link href="/membros/novo" className="btn btn-primary">
            <IconUserPlus size={17} />
            Novo membro
          </Link>
        }
      />
      <MembersBrowser initialMembers={members} initialFacets={facets} filters={filters} />
    </>
  );
}
