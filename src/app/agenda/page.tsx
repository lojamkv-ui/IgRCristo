import type { Metadata } from "next";
import Link from "next/link";
import { IconArrowLeft, IconPlus } from "@/components/icons";
import { AgendaBoard } from "@/components/AgendaBoard";
import { PageHeader } from "@/components/ui/primitives";
import { listServices } from "@/lib/repo";
import { ensureSeed } from "@/lib/seed";

export const metadata: Metadata = { title: "Agenda de cultos" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AgendaPage({ searchParams }: Props) {
  await ensureSeed();
  const params = await searchParams;
  const rawHighlight = Array.isArray(params.destaque) ? params.destaque[0] : params.destaque;
  const highlightId = Number(rawHighlight);

  const services = await listServices();

  return (
    <>
      <PageHeader
        title="Agenda de cultos"
        description="Escale dirigente, pregador, cantores e intercessores. Gere o flyer de divulgação com os dados oficiais da igreja."
        breadcrumb={
          <Link href="/" className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-brand-700">
            <IconArrowLeft size={13} />
            Painel
          </Link>
        }
        actions={
          <Link href="/agenda/novo" className="btn btn-primary">
            <IconPlus size={17} />
            Agendar culto
          </Link>
        }
      />
      <AgendaBoard
        initialServices={services}
        highlightId={Number.isInteger(highlightId) && highlightId > 0 ? highlightId : undefined}
      />
    </>
  );
}
