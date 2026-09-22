"use client";

import { useMemo, useState } from "react";
import { useFetch, usePageTitle } from "@/lib/client";
import { fold, formatMonthYear } from "@/lib/format";
import { suggestFlyerThemeId } from "@/lib/flyer-themes";
import type { ServiceItem } from "@/lib/types";
import { GuardedLink } from "@/components/providers";
import { ServiceTicket } from "@/components/ServiceTicket";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui";

export default function AgendaPage() {
  usePageTitle("Agenda");
  const { data, error, loading, reload } = useFetch<{ services: ServiceItem[]; today: string }>("/api/services");
  const [scope, setScope] = useState<"upcoming" | "past" | "all">("upcoming");
  const [q, setQ] = useState("");
  const today = data?.today ?? "";
  const filtered = useMemo(() => {
    const query = fold(q);
    return (data?.services ?? [])
      .filter((service) => {
        if (scope === "upcoming" && service.serviceDate < today) return false;
        if (scope === "past" && service.serviceDate >= today) return false;
        if (!query) return true;
        const haystack = fold([service.title, service.theme, service.leaderName, service.preacherName, ...service.singers.map((person) => person.name), ...service.intercessors.map((person) => person.name)].join(" "));
        return haystack.includes(query);
      })
      .sort((a, b) => scope === "past" ? b.serviceDate.localeCompare(a.serviceDate) : a.serviceDate.localeCompare(b.serviceDate) || a.serviceTime.localeCompare(b.serviceTime));
  }, [data, q, scope, today]);

  let lastMonth = "";
  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">Cultos</p>
          <h1>Agenda da sede</h1>
          <p className="lede">Dirigente, pregador, cantores e intercessores. O flyer de cada culto sai daqui.</p>
        </div>
        <GuardedLink className="btn btn-primary" href="/agenda/novo">Novo culto</GuardedLink>
      </header>
      <div className="scope-tabs">
        {([["upcoming", "Próximos"], ["past", "Realizados"], ["all", "Todos"]] as const).map(([id, label]) => (
          <button key={id} type="button" className={scope === id ? "active" : ""} onClick={() => setScope(id)}>{label}</button>
        ))}
        <input className="control" style={{ maxWidth: 280 }} value={q} onChange={(event) => setQ(event.target.value)} placeholder="Buscar pregador, tema, cantor" aria-label="Buscar na agenda" />
      </div>
      {error ? <ErrorState message={error} onRetry={reload} /> : null}
      {!data && loading ? <Skeleton rows={3} /> : null}
      {data && filtered.length === 0 ? <EmptyState title="Nenhum culto neste recorte" text="Mude o período ou registre o próximo culto." action={<GuardedLink className="btn btn-primary" href="/agenda/novo">Novo culto</GuardedLink>} /> : null}
      {filtered.map((service) => {
        const month = formatMonthYear(service.serviceDate);
        const showMonth = month !== lastMonth;
        lastMonth = month;
        return (
          <div key={service.id} className="stack">
            {showMonth ? <h2 className="month-label">{month}</h2> : null}
            <ServiceTicket
              service={service}
              today={today}
              actions={
                <>
                  <GuardedLink className="btn btn-small btn-gold" href={`/agenda/${service.id}/flyer`}>Gerar flyer</GuardedLink>
                  <GuardedLink className="btn btn-small btn-ghost" href={`/agenda/${service.id}`}>Abrir</GuardedLink>
                </>
              }
            />
          </div>
        );
      })}
    </div>
  );
}
