"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, useFetch, usePageTitle } from "@/lib/client";
import { changeTypeLabel, formatDateBR, formatDateTime, formatMaybe, kinshipLabel, statusLabel } from "@/lib/format";
import { FIELD_LABELS } from "@/lib/constants";
import type { HistoryEntry, MemberDetail, OptionsPayload } from "@/lib/types";
import { MemberForm } from "@/components/MemberForm";
import { GuardedLink, useToast } from "@/components/providers";
import { Avatar, ErrorState, Modal, Skeleton, StatusBadge } from "@/components/ui";

export default function MemberDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();
  const { push } = useToast();
  const detail = useFetch<{ member: MemberDetail }>(Number.isInteger(id) ? `/api/members/${id}` : null);
  const [editing, setEditing] = useState(false);
  const options = useFetch<OptionsPayload>(editing ? "/api/options" : null);
  const [confirm, setConfirm] = useState(false);
  const [checked, setChecked] = useState(false);
  const [removing, setRemoving] = useState(false);
  const member = detail.data?.member;
  usePageTitle(member?.fullName ?? "Membro");

  const remove = async () => {
    if (!member) return;
    setRemoving(true);
    try {
      await api(`/api/members/${member.id}`, { method: "DELETE" });
      push(`Cadastro de ${member.fullName} excluído.`);
      router.push("/membros");
    } catch (cause) {
      push(cause instanceof Error ? cause.message : "Não foi possível excluir.", "error");
      setRemoving(false);
    }
  };

  if (!Number.isInteger(id)) return <ErrorState message="Membro inválido." />;
  if (detail.error) return <ErrorState message={detail.error} onRetry={detail.reload} />;
  if (!member) return <Skeleton rows={4} />;

  if (editing) {
    return (
      <div className="stack">
        <header className="page-head">
          <div>
            <p className="kicker">Editar cadastro</p>
            <h1>{member.fullName}</h1>
          </div>
        </header>
        {!options.data ? <Skeleton rows={3} /> : <MemberForm mode="edit" initial={member} options={options.data} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); void detail.reload(); }} />}
      </div>
    );
  }

  return (
    <div className="stack">
      <header className="page-head">
        <div>
          <p className="kicker">Ficha</p>
          <h1>{member.fullName}</h1>
        </div>
        <div className="inline-actions no-print">
          <button type="button" className="btn btn-ghost" onClick={() => window.print()}>Imprimir</button>
          <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>Editar</button>
        </div>
      </header>
      <section className="card profile-hero">
        <Avatar name={member.fullName} src={member.photoUrl} size={148} />
        <div className="stack">
          <div className="inline-actions"><StatusBadge status={member.status} label={statusLabel(member.status)} />{member.ecclesiastical.map((office) => <span key={office.title} className="chip">{office.title}</span>)}</div>
          <p>{[member.phone, member.email, member.city].filter(Boolean).join(" · ") || "Contato ainda não informado."}</p>
          {member.kinshipType ? <p>Parentesco: {kinshipLabel(member.kinshipType)}{member.kinshipMemberName ? ` de ${member.kinshipMemberName}` : ""}{member.kinshipNotes ? ` — ${member.kinshipNotes}` : ""}</p> : <p className="muted">Sem parentesco informado.</p>}
          <div className="inline-actions no-print">
            <GuardedLink className="btn btn-small btn-ghost" href={`/agenda/novo?preacher=${member.id}`}>Escalar como pregador</GuardedLink>
            <GuardedLink className="btn btn-small btn-ghost" href={`/agenda/novo?singer=${member.id}`}>Escalar no louvor</GuardedLink>
          </div>
        </div>
      </section>
      <section className="card">
        <h2>Dados</h2>
        <dl className="dl-grid" style={{ marginTop: 12 }}>
          <Info label="Nascimento" value={formatDateBR(member.birthDate)} />
          <Info label="Gênero" value={member.gender || "—"} />
          <Info label="Estado civil" value={member.maritalStatus || "—"} />
          <Info label="CPF" value={member.cpf || "—"} />
          <Info label="Endereço" value={[member.address, member.neighborhood, member.city].filter(Boolean).join(" · ") || "—"} />
          <Info label="Conversão" value={formatDateBR(member.conversionDate)} />
          <Info label="Batismo" value={formatDateBR(member.baptismDate)} />
          <Info label="Membro desde" value={formatDateBR(member.memberSince)} />
        </dl>
        {member.notes ? <p style={{ marginTop: 12 }}>{member.notes}</p> : null}
      </section>
      <section className="card">
        <h2>Cargos eclesiásticos</h2>
        {member.ecclesiastical.length ? member.ecclesiastical.map((office) => (
          <p key={`${office.title}-${office.consecrationDate}`} style={{ marginTop: 8 }}><strong>{office.title}</strong> · consagração em {formatDateBR(office.consecrationDate)}{office.notes ? ` · ${office.notes}` : ""}</p>
        )) : <p className="muted">Nenhum cargo eclesiástico.</p>}
        <h2 style={{ marginTop: 18 }}>Cargos locais</h2>
        {member.local.length ? member.local.map((office) => (
          <p key={`${office.title}-${office.startDate}`} style={{ marginTop: 8 }}><strong>{office.title}</strong> · {formatDateBR(office.startDate)} até {office.endDate ? formatDateBR(office.endDate) : "em exercício"}{office.notes ? ` · ${office.notes}` : ""}</p>
        )) : <p className="muted">Nenhum cargo local.</p>}
      </section>
      <HistoryPanel entries={member.history} />
      <section className="danger-zone no-print">
        <h2>Excluir cadastro</h2>
        <p>O histórico desta pessoa também será removido. Cultos já registrados mantêm o nome, mas perdem o vínculo.</p>
        <button type="button" className="btn btn-danger" onClick={() => setConfirm(true)}>Excluir {member.fullName}</button>
      </section>
      <Modal open={confirm} title="Excluir este cadastro?" onClose={() => setConfirm(false)}>
        <p>Esta ação não pode ser desfeita. Confirme que entende a perda do histórico de <strong>{member.fullName}</strong>.</p>
        <label className="checkline"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /> Entendo que o histórico será apagado.</label>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setConfirm(false)}>Cancelar</button>
          <button type="button" className="btn btn-danger" disabled={!checked || removing} onClick={() => void remove()}>Excluir cadastro</button>
        </div>
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function HistoryPanel({ entries }: { entries: HistoryEntry[] }) {
  const [type, setType] = useState("todos");
  const [open, setOpen] = useState<number | null>(null);
  const filtered = type === "todos" ? entries : entries.filter((entry) => entry.changeType === type);
  const types = ["todos", ...Array.from(new Set(entries.map((entry) => entry.changeType)))];
  return (
    <section className="stack" id="historico">
      <div className="section-title">
        <h2>Histórico de atualizações</h2>
        <label className="field">Filtrar por tipo
          <select className="control" value={type} onChange={(event) => setType(event.target.value)}>
            {types.map((item) => <option key={item} value={item}>{item === "todos" ? "Todos" : changeTypeLabel(item)}</option>)}
          </select>
        </label>
      </div>
      {filtered.length === 0 ? <div className="card"><p>Nenhuma alteração deste tipo.</p></div> : null}
      <div className="history-list">
        {filtered.map((entry) => (
          <article key={entry.id} className="history-item">
            <div className="history-top">
              <StatusBadge status={entry.changeType} label={changeTypeLabel(entry.changeType)} />
              <time dateTime={entry.changedAt} title={formatDateTime(entry.changedAt)}>{formatDateTime(entry.changedAt)}</time>
            </div>
            <p style={{ marginTop: 8 }}>{entry.summary}</p>
            <p className="hint">por {entry.actor}</p>
            <button type="button" className="btn btn-small btn-ghost" onClick={() => setOpen(open === entry.id ? null : entry.id)}>{open === entry.id ? "Ocultar dados" : "Ver dados anteriores e novos"}</button>
            {open === entry.id ? (
              <div className="diff-grid">
                <DataBlock title="Antes" data={entry.previousData} />
                <DataBlock title="Depois" data={entry.newData} />
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function DataBlock({ title, data }: { title: string; data: unknown }) {
  const entries = data && typeof data === "object" && !Array.isArray(data) ? Object.entries(data as Record<string, unknown>) : null;
  return (
    <div>
      <strong>{title}</strong>
      {!data ? <p className="muted">Sem registro anterior.</p> : null}
      {entries ? (
        <dl>{entries.map(([key, value]) => <div key={key}><dt>{FIELD_LABELS[key] ?? key}</dt><dd>{formatMaybe(value)}</dd></div>)}</dl>
      ) : null}
      {Array.isArray(data) ? <pre>{data.map((item) => formatMaybe(item)).join("\n\n")}</pre> : null}
    </div>
  );
}
