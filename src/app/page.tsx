"use client";

import { useEffect, useState } from "react";
import { useFetch, usePageTitle } from "@/lib/client";
import { changeTypeLabel, formatLongDate, formatTime, greeting, relativeTime } from "@/lib/format";
import { suggestFlyerThemeId } from "@/lib/flyer-themes";
import type { DashboardPayload } from "@/lib/types";
import { GuardedLink } from "@/components/providers";
import { ServiceTicket } from "@/components/ServiceTicket";
import { Avatar, ErrorState, Skeleton, StatusBadge } from "@/components/ui";

export default function HomePage() {
  usePageTitle("Início");
  const { data, error, loading, reload } = useFetch<DashboardPayload>("/api/dashboard");
  const [hello, setHello] = useState("Olá");
  useEffect(() => setHello(greeting()), []);

  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data && loading) return <Skeleton rows={4} />;
  if (!data) return null;
  const next = data.nextService;

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">Sede · Trindade/GO</p>
          <h1>{hello}, secretaria.</h1>
          <p className="lede">Cadastro da casa, cargos, parentesco e a agenda dos cultos — com histórico de cada alteração e flyer pronto para enviar.</p>
        </div>
        <GuardedLink className="btn btn-primary" href="/agenda/novo">Novo culto</GuardedLink>
      </header>

      <article className="hero-card">
        <img className="hero-photo" src="/brand/hero.jpg" alt="" />
        <div className="hero-shade" />
        <div className="hero-content">
          <p className="kicker">{next ? "Próximo culto" : "Agenda"}</p>
          {next ? (
            <>
              <h2>{next.title}</h2>
              <p className="hero-meta">{formatLongDate(next.serviceDate)} · {formatTime(next.serviceTime)}</p>
              {next.theme ? <p className="theme">{next.theme}</p> : null}
              <div className="hero-people">
                <Avatar name={next.preacherName} src={next.preacherPhotoUrl} size={46} />
                <div>
                  <strong>{next.preacherName}</strong>
                  <p>Pregação · dirige {next.leaderName}</p>
                </div>
              </div>
              <div className="hero-actions">
                <GuardedLink className="btn btn-gold" href={`/agenda/${next.id}/flyer?tema=${suggestFlyerThemeId(next.title, next.theme)}`}>Gerar flyer</GuardedLink>
                <GuardedLink className="btn btn-ghost hero-link" href={`/agenda/${next.id}`}>Ver culto</GuardedLink>
              </div>
            </>
          ) : (
            <>
              <h2>Nenhum culto à frente</h2>
              <p>Registre o próximo para já deixar o cartaz pronto.</p>
              <GuardedLink className="btn btn-gold" href="/agenda/novo">Agendar culto</GuardedLink>
            </>
          )}
        </div>
      </article>

      <section className="stat-grid">
        <GuardedLink href="/membros?status=ativo" className="stat-card"><strong>{data.stats.activeMembers}</strong><span>membros ativos e congregados</span></GuardedLink>
        <GuardedLink href="/agenda" className="stat-card"><strong>{data.stats.servicesThisMonth}</strong><span>cultos neste mês</span></GuardedLink>
        <GuardedLink href="/membros" className="stat-card"><strong>{data.stats.activeLocalOffices}</strong><span>cargos locais em exercício</span></GuardedLink>
        <GuardedLink href="/membros?sort=birthday" className="stat-card"><strong>{data.stats.birthdays}</strong><span>aniversariantes do mês</span></GuardedLink>
      </section>

      <div className="two-col">
        <section className="stack">
          <div className="section-title"><h2>Próximos cultos</h2><GuardedLink href="/agenda">Agenda completa</GuardedLink></div>
          {data.upcoming.length ? data.upcoming.map((service) => (
            <ServiceTicket key={service.id} service={service} today={data.today} actions={<GuardedLink className="btn btn-small btn-primary" href={`/agenda/${service.id}/flyer`}>Gerar flyer</GuardedLink>} />
          )) : <div className="card"><p>A agenda dos próximos dias ainda está vazia.</p></div>}
        </section>
        <section className="stack">
          <div className="section-title"><h2>Aniversariantes</h2></div>
          <div className="card stack">
            {data.birthdays.length ? data.birthdays.map((person) => (
              <GuardedLink key={person.id} href={`/membros/${person.id}`} className="hero-people">
                <Avatar name={person.fullName} src={person.photoUrl} size={42} />
                <div>
                  <strong>{person.fullName}</strong>
                  <p className="muted">Dia {person.day} · faz {person.turning} {person.isToday ? "· hoje" : ""}</p>
                </div>
              </GuardedLink>
            )) : <p className="muted">Ninguém faz aniversário neste mês.</p>}
          </div>
          <div className="section-title"><h2>Histórico recente</h2></div>
          <div className="stack">
            {data.recentChanges.length ? data.recentChanges.map((change) => (
              <GuardedLink key={change.id} href={`/membros/${change.memberId}#historico`} className="history-item">
                <div className="history-top">
                  <StatusBadge status={change.changeType} label={changeTypeLabel(change.changeType)} />
                  <span className="muted" title={change.changedAt}>{relativeTime(change.changedAt)}</span>
                </div>
                <strong>{change.memberName}</strong>
                <p>{change.summary}</p>
              </GuardedLink>
            )) : <div className="card"><p className="muted">As alterações de cadastro aparecem aqui.</p></div>}
          </div>
        </section>
      </div>
    </div>
  );
}
