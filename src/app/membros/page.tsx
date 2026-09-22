"use client";

import { useEffect, useMemo, useState } from "react";
import { useFetch, usePageTitle } from "@/lib/client";
import { downloadText, formatDateBR, kinshipLabel, statusLabel, toCsv } from "@/lib/format";
import type { MemberListItem, OptionsPayload } from "@/lib/types";
import { GuardedLink } from "@/components/providers";
import { Avatar, EmptyState, ErrorState, Skeleton, StatusBadge } from "@/components/ui";

type ListResponse = { members: MemberListItem[]; total: number; today: string };

export default function MembersPage() {
  usePageTitle("Membros");
  const options = useFetch<OptionsPayload>("/api/options");
  const [ready, setReady] = useState(false);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [ecclesiastical, setEcclesiastical] = useState("");
  const [local, setLocal] = useState("");
  const [localActive, setLocalActive] = useState(true);
  const [kinship, setKinship] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("name");
  const [view, setView] = useState("grid");
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQ(params.get("q") ?? "");
    setDebounced(params.get("q") ?? "");
    setEcclesiastical(params.get("ecclesiastical") ?? "");
    setLocal(params.get("local") ?? "");
    setLocalActive(params.get("localActive") !== "0");
    setKinship(params.get("kinship") ?? "");
    setStatus(params.get("status") ?? "");
    setSort(params.get("sort") ?? "name");
    setView(localStorage.getItem("renascendo.member-view") || "grid");
    if (window.matchMedia("(max-width: 720px)").matches) setFiltersOpen(false);
    setReady(true);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(q.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [q]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (debounced) params.set("q", debounced);
    if (ecclesiastical) params.set("ecclesiastical", ecclesiastical);
    if (local) params.set("local", local);
    if (local && !localActive) params.set("localActive", "0");
    if (kinship) params.set("kinship", kinship);
    if (status) params.set("status", status);
    if (sort !== "name") params.set("sort", sort);
    return params.toString();
  }, [debounced, ecclesiastical, local, localActive, kinship, status, sort]);

  useEffect(() => {
    if (!ready) return;
    window.history.replaceState(null, "", query ? `/membros?${query}` : "/membros");
  }, [query, ready]);

  const list = useFetch<ListResponse>(ready ? `/api/members?${query}` : null);
  const activeCount = [debounced, ecclesiastical, local, kinship, status].filter(Boolean).length;

  const exportCsv = () => {
    const rows = [["Nome", "Status", "Telefone", "E-mail", "Cidade", "Parentesco", "Cargos eclesiásticos", "Cargos locais"]];
    for (const member of list.data?.members ?? []) {
      rows.push([
        member.fullName,
        statusLabel(member.status),
        member.phone ?? "",
        member.email ?? "",
        member.city ?? "",
        member.kinshipType ? `${kinshipLabel(member.kinshipType)}${member.kinshipMemberName ? ` de ${member.kinshipMemberName}` : ""}` : "",
        member.ecclesiastical.map((office) => office.title).join(", "),
        member.local.map((office) => office.title).join(", "),
      ]);
    }
    downloadText("membros-renascendo.csv", `\uFEFF${toCsv(rows)}`, "text/csv;charset=utf-8");
  };

  return (
    <div>
      <header className="page-head">
        <div>
          <p className="kicker">Cadastro</p>
          <h1>Membros da sede</h1>
          <p className="lede">Busque por nome, cargo eclesiástico, cargo local e parentesco. Os filtros se combinam.</p>
        </div>
        <div className="inline-actions">
          <button type="button" className="btn btn-ghost" onClick={exportCsv} disabled={!list.data?.members.length}>Exportar</button>
          <GuardedLink className="btn btn-primary" href="/membros/novo">Novo membro</GuardedLink>
        </div>
      </header>

      <section className="filters">
        <div className="split-head" style={{ border: 0, margin: 0, padding: 0 }}>
          <button type="button" className="btn btn-small btn-ghost" onClick={() => setFiltersOpen((value) => !value)}>{filtersOpen ? "Ocultar filtros" : `Filtros${activeCount ? ` (${activeCount})` : ""}`}</button>
          <div className="inline-actions">
            <button type="button" className={`btn btn-small ${view === "grid" ? "btn-primary" : "btn-ghost"}`} onClick={() => { setView("grid"); localStorage.setItem("renascendo.member-view", "grid"); }}>Cartões</button>
            <button type="button" className={`btn btn-small ${view === "list" ? "btn-primary" : "btn-ghost"}`} onClick={() => { setView("list"); localStorage.setItem("renascendo.member-view", "list"); }}>Lista</button>
          </div>
        </div>
        {filtersOpen ? (
          <div className="filter-grid" style={{ marginTop: 12 }}>
            <label className="field">Nome<input className="control" value={q} onChange={(event) => setQ(event.target.value)} placeholder="Buscar por nome" aria-label="Filtrar por nome" /></label>
            <label className="field">Cargo eclesiástico<select className="control" value={ecclesiastical} onChange={(event) => setEcclesiastical(event.target.value)}><option value="">Todos</option>{options.data?.ecclesiasticalTitles.map((title) => <option key={title}>{title}</option>)}</select></label>
            <label className="field">Cargo local<select className="control" value={local} onChange={(event) => setLocal(event.target.value)}><option value="">Todos</option>{options.data?.localTitles.map((title) => <option key={title}>{title}</option>)}</select></label>
            <label className="field">Parentesco<select className="control" value={kinship} onChange={(event) => setKinship(event.target.value)}><option value="">Todos</option><option value="__none__">Sem parentesco informado</option>{options.data?.kinshipTypes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label className="field">Status<select className="control" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos</option>{options.data?.statuses.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          </div>
        ) : null}
        <div className="chip-row">
          <label className="checkline"><input type="checkbox" checked={localActive} onChange={(event) => setLocalActive(event.target.checked)} /> Somente cargo local em exercício</label>
          <label className="field" style={{ minWidth: 180 }}>Ordenar<select className="control" value={sort} onChange={(event) => setSort(event.target.value)}><option value="name">Nome</option><option value="recent">Atualizados recentemente</option><option value="birthday">Aniversário</option></select></label>
          {activeCount ? <button type="button" className="btn btn-small btn-ghost" onClick={() => { setQ(""); setDebounced(""); setEcclesiastical(""); setLocal(""); setKinship(""); setStatus(""); }}>Limpar filtros</button> : null}
        </div>
        {ecclesiastical || local || kinship || status || debounced ? (
          <div className="chip-row">
            {debounced ? <button type="button" className="chip chip-clear" onClick={() => { setQ(""); setDebounced(""); }}>Nome: {debounced} ×</button> : null}
            {ecclesiastical ? <button type="button" className="chip chip-clear" onClick={() => setEcclesiastical("")}>Eclesiástico: {ecclesiastical} ×</button> : null}
            {local ? <button type="button" className="chip chip-clear" onClick={() => setLocal("")}>Local: {local} ×</button> : null}
            {kinship ? <button type="button" className="chip chip-clear" onClick={() => setKinship("")}>Parentesco: {kinship === "__none__" ? "sem vínculo" : kinshipLabel(kinship)} ×</button> : null}
            {status ? <button type="button" className="chip chip-clear" onClick={() => setStatus("")}>Status: {statusLabel(status)} ×</button> : null}
          </div>
        ) : null}
      </section>

      <p className="result-count" aria-live="polite">{list.loading && !list.data ? "Buscando…" : `${list.data?.total ?? 0} membro${list.data?.total === 1 ? "" : "s"}${activeCount ? " com os filtros combinados" : ""}`}</p>
      {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : null}
      {!list.data && list.loading ? <Skeleton rows={4} /> : null}
      {list.data && list.data.members.length === 0 ? <EmptyState title="Nenhuma pessoa encontrada" text="Limpe um filtro ou cadastre um novo membro." action={<GuardedLink className="btn btn-primary" href="/membros/novo">Novo membro</GuardedLink>} /> : null}
      <div className={`member-grid ${view}`} style={{ opacity: list.loading ? 0.65 : 1 }}>
        {list.data?.members.map((member) => (
          <GuardedLink key={member.id} href={`/membros/${member.id}`} className="member-card">
            <Avatar name={member.fullName} src={member.photoUrl} size={72} />
            <div>
              <div className="history-top"><h3>{member.fullName}</h3><StatusBadge status={member.status} label={statusLabel(member.status)} /></div>
              <p>{[member.city, member.phone].filter(Boolean).join(" · ") || "Sem contato informado"}</p>
              {member.kinshipType ? <p>Parentesco: {kinshipLabel(member.kinshipType)}{member.kinshipMemberName ? ` de ${member.kinshipMemberName}` : ""}</p> : null}
              <div className="chip-row">
                {member.ecclesiastical.slice(0, 2).map((office) => <span key={office.title} className="chip">{office.title}</span>)}
                {member.local.filter((office) => office.active).slice(0, 2).map((office) => <span key={office.title} className="chip chip-local">{office.title}</span>)}
              </div>
              {member.birthDate ? <p className="hint">Nascimento {formatDateBR(member.birthDate)}</p> : null}
            </div>
          </GuardedLink>
        ))}
      </div>
    </div>
  );
}
