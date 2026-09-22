"use client";

import { useFetch, usePageTitle } from "@/lib/client";
import type { OptionsPayload } from "@/lib/types";
import { ServiceForm } from "@/components/ServiceForm";
import { GuardedLink } from "@/components/providers";
import { ErrorState, Skeleton } from "@/components/ui";

export default function NewServicePage() {
  usePageTitle("Novo culto");
  const options = useFetch<OptionsPayload>("/api/options");
  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">Agenda</p>
          <h1>Novo culto</h1>
          <p className="lede">Data, hora, dirigente, pregador, cantores e intercessores. A foto do pregador e dos cantores pode vir do cadastro ou ser enviada só para este culto.</p>
        </div>
        <GuardedLink className="btn btn-ghost" href="/agenda">Voltar</GuardedLink>
      </header>
      {options.error ? <ErrorState message={options.error} onRetry={options.reload} /> : null}
      {!options.data ? <Skeleton rows={3} /> : <ServiceForm mode="create" options={options.data} />}
    </div>
  );
}
