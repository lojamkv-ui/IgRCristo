"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, useFetch, usePageTitle } from "@/lib/client";
import { formatDateTime, formatLongDate, formatTime } from "@/lib/format";
import { suggestFlyerThemeId } from "@/lib/flyer-themes";
import type { OptionsPayload, ServiceItem } from "@/lib/types";
import { ServiceForm } from "@/components/ServiceForm";
import { GuardedLink, useToast } from "@/components/providers";
import { Avatar, ErrorState, Modal, Skeleton } from "@/components/ui";

export default function ServiceDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const { push } = useToast();
  const detail = useFetch<{ service: ServiceItem }>(Number.isInteger(id) ? `/api/services/${id}` : null);
  const [editing, setEditing] = useState(false);
  const options = useFetch<OptionsPayload>(editing ? "/api/options" : null);
  const [confirm, setConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);
  const service = detail.data?.service;
  usePageTitle(service ? service.title : "Culto");

  const remove = async () => {
    if (!service) return;
    setRemoving(true);
    try {
      await api(`/api/services/${service.id}`, { method: "DELETE" });
      push("Culto excluído da agenda.");
      router.push("/agenda");
    } catch (cause) {
      push(cause instanceof Error ? cause.message : "Não foi possível excluir.", "error");
      setRemoving(false);
    }
  };

  if (!Number.isInteger(id)) return <ErrorState message="Culto inválido." />;
  if (detail.error) return <ErrorState message={detail.error} onRetry={detail.reload} />;
  if (!service) return <Skeleton rows={3} />;
  if (editing) {
    return (
      <div className="stack">
        <header className="page-head"><div><p className="kicker">Editar culto</p><h1>{service.title}</h1></div></header>
        {!options.data ? <Skeleton /> : <ServiceForm mode="edit" initial={service} options={options.data} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); void detail.reload(); }} />}
      </div>
    );
  }

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">{formatLongDate(service.serviceDate)} · {formatTime(service.serviceTime)}</p>
          <h1>{service.title}</h1>
          {service.theme ? <p className="theme">{service.theme}</p> : null}
        </div>
        <div className="inline-actions no-print">
          <GuardedLink className="btn btn-gold" href={`/agenda/${service.id}/flyer?tema=${suggestFlyerThemeId(service.title, service.theme)}`}>Gerar flyer</GuardedLink>
          <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>Editar</button>
          <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}>Excluir</button>
        </div>
      </header>
      <section className="card stack">
        <Person title="Dirigente" name={service.leaderName} photo={service.leaderPhotoUrl} href={service.leaderId ? `/membros/${service.leaderId}` : undefined} />
        <Person title="Pregador" name={service.preacherName} photo={service.preacherPhotoUrl} href={service.preacherId ? `/membros/${service.preacherId}` : undefined} />
        <div>
          <p className="kicker">Cantores</p>
          {service.singers.length ? service.singers.map((person) => <Person key={`${person.name}-${person.id}`} title="Louvor" name={person.name} photo={person.photoUrl} href={person.memberId ? `/membros/${person.memberId}` : undefined} />) : <p className="muted">Nenhum cantor escalado.</p>}
        </div>
        <div>
          <p className="kicker">Intercessores</p>
          {service.intercessors.length ? <p>{service.intercessors.map((person) => person.name).join(", ")}</p> : <p className="muted">Nenhum intercessor escalado.</p>}
        </div>
        {service.notes ? <p>{service.notes}</p> : null}
        <p className="hint">Atualizado em {formatDateTime(service.updatedAt)}</p>
      </section>
      <Modal open={confirm} title="Excluir este culto?" onClose={() => setConfirm(false)}>
        <p>O culto de {formatLongDate(service.serviceDate)} será removido da agenda. O flyer deixa de estar disponível.</p>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setConfirm(false)}>Cancelar</button>
          <button type="button" className="btn btn-danger" disabled={removing} onClick={() => void remove()}>Excluir culto</button>
        </div>
      </Modal>
    </div>
  );
}

function Person({ title, name, photo, href }: { title: string; name: string; photo?: string | null; href?: string }) {
  const body = (
    <div className="hero-people">
      <Avatar name={name} src={photo} size={52} />
      <div><p className="kicker">{title}</p><strong>{name}</strong></div>
    </div>
  );
  return href ? <GuardedLink href={href}>{body}</GuardedLink> : body;
}
