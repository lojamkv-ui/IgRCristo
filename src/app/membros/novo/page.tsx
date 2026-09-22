"use client";

import { useFetch, usePageTitle } from "@/lib/client";
import type { OptionsPayload } from "@/lib/types";
import { MemberForm } from "@/components/MemberForm";
import { GuardedLink } from "@/components/providers";
import { ErrorState, Skeleton } from "@/components/ui";

export default function NewMemberPage() {
  usePageTitle("Novo membro");
  const options = useFetch<OptionsPayload>("/api/options");
  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">Cadastro</p>
          <h1>Nova pessoa</h1>
          <p className="lede">Campos com asterisco são obrigatórios. O restante pode ser completado depois — cada salvamento fica no histórico.</p>
        </div>
        <GuardedLink className="btn btn-ghost" href="/membros">Voltar</GuardedLink>
      </header>
      {options.error ? <ErrorState message={options.error} onRetry={options.reload} /> : null}
      {!options.data ? <Skeleton rows={3} /> : <MemberForm mode="create" options={options.data} />}
    </div>
  );
}
