"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconFilter,
  IconMail,
  IconPencil,
  IconPhone,
  IconPlus,
  IconSearch,
  IconStar,
  IconTrash,
  IconUsers,
  IconX,
} from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/Modal";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Segmented,
  Select,
  Skeleton,
  StatusBadge,
  TableSkeleton,
  TextInput,
} from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage, type Facets } from "@/lib/api";
import { ageFrom, formatDateBR, maskPhone } from "@/lib/format";
import { KINSHIPS, MEMBER_STATUS, type MemberFilters, type MemberWithRoles } from "@/lib/types";

const PAGE_SIZE = 24;

function roleSummary(member: MemberWithRoles) {
  const ecclesiastical = member.roles.filter((role) => role.kind === "eclesiastico");
  const local = member.roles.filter((role) => role.kind === "local");
  return { ecclesiastical, local };
}

export function MembersBrowser({
  initialMembers,
  initialFacets,
  filters: initialFilters,
}: {
  initialMembers: MemberWithRoles[];
  initialFacets: Facets;
  filters: MemberFilters;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [members, setMembers] = useState<MemberWithRoles[]>(initialMembers);
  const [facets, setFacets] = useState<Facets>(initialFacets);
  const [filters, setFilters] = useState<MemberFilters>(initialFilters);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"cards" | "table">("cards");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [pendingDelete, setPendingDelete] = useState<MemberWithRoles | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const requestId = useRef(0);
  const firstRun = useRef(true);

  /* ------------------------- busca + sincronia de URL ------------------------ */
  useEffect(() => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "todos") query.set(key, String(value));
    });
    const qs = query.toString();
    router.replace(qs ? `/membros?${qs}` : "/membros", { scroll: false });

    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    const current = ++requestId.current;
    const delay = filters.q ? 320 : 0;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await api.members.list(filters);
        if (current !== requestId.current) return; // resposta obsoleta
        setMembers(response.data);
        setFacets(response.facets);
        setVisible(PAGE_SIZE);
      } catch (error) {
        if (current !== requestId.current) return;
        toast("error", "Falha na busca", errorMessage(error));
      } finally {
        if (current === requestId.current) setLoading(false);
      }
    }, delay);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const setFilter = useCallback(<K extends keyof MemberFilters>(key: K, value: MemberFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  }, []);

  const activeFilters = Object.entries(filters).filter(
    ([key, value]) => value && value !== "todos" && key !== "sort",
  );

  function clearFilters() {
    setFilters({ sort: filters.sort ?? "name" });
    toast("info", "Filtros limpos", "Exibindo todos os membros cadastrados.");
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.members.remove(pendingDelete.id);
      setMembers((current) => current.filter((member) => member.id !== pendingDelete.id));
      toast("success", "Cadastro excluído", `${pendingDelete.name} foi removido com cargos e histórico.`);
      setPendingDelete(null);
      router.refresh();
    } catch (error) {
      toast("error", "Não foi possível excluir", errorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  const shown = members.slice(0, visible);

  /* --------------------------------- render -------------------------------- */
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="overflow-visible">
        <div className="flex flex-col gap-3 p-3.5 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
                <IconSearch size={18} />
              </span>
              <TextInput
                type="search"
                value={filters.q ?? ""}
                onChange={(event) => setFilter("q", event.target.value)}
                placeholder="Buscar por nome, cargo, telefone, e-mail, família ou observação…"
                className="pl-11"
                aria-label="Buscar membros"
              />
              {filters.q ? (
                <button
                  type="button"
                  onClick={() => setFilter("q", "")}
                  className="icon-btn absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2"
                  aria-label="Limpar busca"
                >
                  <IconX size={15} />
                </button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => setShowFilters((value) => !value)}
                aria-expanded={showFilters}
              >
                <IconFilter size={16} />
                Filtros
                {activeFilters.length > 0 ? (
                  <span className="ml-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white">
                    {activeFilters.length}
                  </span>
                ) : null}
              </Button>
              <Link href="/membros/novo" className="btn btn-primary flex-1 sm:flex-none">
                <IconPlus size={16} />
                Novo membro
              </Link>
            </div>
          </div>

          {/* Filtros avançados */}
          <div
            className={`grid gap-3 overflow-hidden transition-all duration-300 ${
              showFilters || activeFilters.length > 0
                ? "grid-rows-[1fr] opacity-100 sm:grid-cols-2 xl:grid-cols-5"
                : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="min-h-0 col-span-full grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div>
                <label className="label" htmlFor="filter-ecclesiastical">
                  Cargo eclesiástico
                </label>
                <Select
                  id="filter-ecclesiastical"
                  value={filters.ecclesiastical ?? ""}
                  onChange={(event) => setFilter("ecclesiastical", event.target.value || undefined)}
                >
                  <option value="">Todos</option>
                  {facets.ecclesiastical.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="label" htmlFor="filter-local">
                  Cargo local
                </label>
                <Select
                  id="filter-local"
                  value={filters.local ?? ""}
                  onChange={(event) => setFilter("local", event.target.value || undefined)}
                >
                  <option value="">Todos</option>
                  {facets.local.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="label" htmlFor="filter-kinship">
                  Parentesco
                </label>
                <Select
                  id="filter-kinship"
                  value={filters.kinship ?? ""}
                  onChange={(event) => setFilter("kinship", event.target.value || undefined)}
                >
                  <option value="">Todos</option>
                  {Array.from(new Set([...facets.kinship, ...KINSHIPS])).map((kinship) => (
                    <option key={kinship} value={kinship}>
                      {kinship}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="label" htmlFor="filter-status">
                  Situação
                </label>
                <Select
                  id="filter-status"
                  value={filters.status ?? ""}
                  onChange={(event) => setFilter("status", event.target.value || undefined)}
                >
                  <option value="">Todas</option>
                  {MEMBER_STATUS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="label" htmlFor="filter-sort">
                  Ordenar por
                </label>
                <Select
                  id="filter-sort"
                  value={filters.sort ?? "name"}
                  onChange={(event) => setFilter("sort", event.target.value as MemberFilters["sort"])}
                >
                  <option value="name">Nome (A-Z)</option>
                  <option value="recent">Atualizados recentemente</option>
                  <option value="created">Mais recentes</option>
                </Select>
              </div>
            </div>
          </div>

          {activeFilters.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Ativos:
              </span>
              {activeFilters.map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key as keyof MemberFilters, undefined)}
                  className="chip border-brand-100 bg-brand-50 text-brand-700 transition hover:bg-brand-100"
                >
                  {key === "q"
                    ? `busca: ${value}`
                    : key === "ecclesiastical"
                      ? `cargo eclesiástico: ${value}`
                      : key === "local"
                        ? `cargo local: ${value}`
                        : key === "kinship"
                          ? `parentesco: ${value}`
                          : `situação: ${value}`}
                  <IconX size={12} />
                </button>
              ))}
              <button type="button" onClick={clearFilters} className="link text-xs">
                Limpar tudo
              </button>
            </div>
          ) : null}
        </div>
      </Card>

      {/* Resultado */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-500" aria-live="polite">
          {loading ? (
            "Buscando…"
          ) : (
            <>
              <strong className="font-display text-ink-900">{members.length}</strong>{" "}
              {members.length === 1 ? "membro encontrado" : "membros encontrados"}
            </>
          )}
        </p>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "cards", label: "Cartões" },
            { value: "table", label: "Lista" },
          ]}
        />
      </div>

      {loading ? (
        <Card>
          <TableSkeleton rows={6} />
        </Card>
      ) : members.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconUsers size={24} />}
            title={activeFilters.length > 0 ? "Nenhum membro com esses filtros" : "Nenhum membro cadastrado"}
            description={
              activeFilters.length > 0
                ? "Ajuste ou limpe os filtros para ampliar a busca."
                : "Comece cadastrando os membros da sua congregação, com foto, cargos e parentesco."
            }
            action={
              activeFilters.length > 0 ? (
                <Button variant="outline" onClick={clearFilters} type="button">
                  <IconX size={15} />
                  Limpar filtros
                </Button>
              ) : (
                <Link href="/membros/novo" className="btn btn-primary">
                  <IconPlus size={16} />
                  Cadastrar primeiro membro
                </Link>
              )
            }
          />
        </Card>
      ) : view === "cards" ? (
        <>
          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {shown.map((member) => (
              <MemberCard key={member.id} member={member} onDelete={() => setPendingDelete(member)} />
            ))}
          </div>
          {members.length > visible ? (
            <div className="flex justify-center pt-1">
              <Button variant="outline" type="button" onClick={() => setVisible((value) => value + PAGE_SIZE)}>
                Carregar mais ({members.length - visible} restantes)
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-surface/70 text-left text-xs uppercase tracking-wide text-ink-500">
                  <th className="px-4 py-3 font-semibold">Membro</th>
                  <th className="px-4 py-3 font-semibold">Contato</th>
                  <th className="px-4 py-3 font-semibold">Parentesco</th>
                  <th className="px-4 py-3 font-semibold">Cargos</th>
                  <th className="px-4 py-3 font-semibold">Situação</th>
                  <th className="px-4 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((member) => {
                  const { ecclesiastical, local } = roleSummary(member);
                  return (
                    <tr key={member.id} className="border-b border-line/70 transition hover:bg-brand-50/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={member.photo} name={member.name} size="sm" />
                          <div className="min-w-0">
                            <Link href={`/membros/${member.id}`} className="block truncate font-semibold text-ink-900 hover:text-brand-700">
                              {member.name}
                            </Link>
                            <span className="text-xs text-ink-500">
                              {member.birthDate ? `${ageFrom(member.birthDate) ?? "—"} anos` : "idade não informada"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-600">
                        {member.phone ? <span className="block">{maskPhone(member.phone)}</span> : null}
                        {member.email ? <span className="block truncate text-xs text-ink-400">{member.email}</span> : null}
                        {!member.phone && !member.email ? <span className="text-ink-300">—</span> : null}
                      </td>
                      <td className="px-4 py-3 text-ink-600">
                        {member.kinship ?? <span className="text-ink-300">—</span>}
                        {member.familyName ? (
                          <span className="block truncate text-xs text-ink-400">{member.familyName}</span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {ecclesiastical.slice(0, 2).map((role) => (
                            <Badge key={role.id} tone="gold">
                              {role.title}
                            </Badge>
                          ))}
                          {local.slice(0, 2).map((role) => (
                            <Badge key={role.id} tone="brand">
                              {role.title}
                            </Badge>
                          ))}
                          {member.roles.length > 4 ? <Badge>+{member.roles.length - 4}</Badge> : null}
                          {member.roles.length === 0 ? <span className="text-ink-300">—</span> : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge kind="member" value={member.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Link href={`/membros/${member.id}`} className="icon-btn" aria-label={`Ver ${member.name}`}>
                            <IconSearch size={16} />
                          </Link>
                          <Link href={`/membros/${member.id}/editar`} className="icon-btn" aria-label={`Editar ${member.name}`}>
                            <IconPencil size={16} />
                          </Link>
                          <button
                            type="button"
                            className="icon-btn text-danger hover:bg-danger-soft hover:text-danger"
                            onClick={() => setPendingDelete(member)}
                            aria-label={`Excluir ${member.name}`}
                          >
                            <IconTrash size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {members.length > visible ? (
            <div className="flex justify-center border-t border-line p-3">
              <Button variant="outline" size="sm" type="button" onClick={() => setVisible((value) => value + PAGE_SIZE)}>
                Carregar mais ({members.length - visible})
              </Button>
            </div>
          ) : null}
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir cadastro"
        loading={deleting}
        confirmLabel="Excluir definitivamente"
        message={
          <>
            Tem certeza que deseja excluir <strong>{pendingDelete?.name}</strong>?
            <br />
            Esta ação remove também os cargos e todo o histórico de alterações do cadastro.
          </>
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

/* ------------------------------ cartão ------------------------------ */

function MemberCard({
  member,
  onDelete,
}: {
  member: MemberWithRoles;
  onDelete: () => void;
}) {
  const { ecclesiastical, local } = roleSummary(member);
  const age = ageFrom(member.birthDate);

  return (
    <article className="card group flex flex-col p-4 transition duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-pop">
      <div className="flex items-start gap-3">
        <Avatar src={member.photo} name={member.name} size="md" />
        <div className="min-w-0 flex-1">
          <Link href={`/membros/${member.id}`} className="line-clamp-2 font-display text-[15px] font-bold leading-snug text-ink-950 hover:text-brand-700">
            {member.name}
          </Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <StatusBadge kind="member" value={member.status} />
            {member.kinship ? <Badge tone="neutral">{member.kinship}</Badge> : null}
            {age !== null ? <Badge tone="neutral">{age} anos</Badge> : null}
          </div>
        </div>
      </div>

      <dl className="mt-3 space-y-1.5 text-[13px] text-ink-600">
        {member.phone ? (
          <div className="flex items-center gap-2">
            <IconPhone size={14} className="shrink-0 text-ink-400" />
            <dd className="truncate">{maskPhone(member.phone)}</dd>
          </div>
        ) : null}
        {member.email ? (
          <div className="flex items-center gap-2">
            <IconMail size={14} className="shrink-0 text-ink-400" />
            <dd className="truncate">{member.email}</dd>
          </div>
        ) : null}
        {member.memberSince ? (
          <div className="flex items-center gap-2">
            <IconStar size={14} className="shrink-0 text-ink-400" />
            <dd className="truncate">Membro desde {formatDateBR(member.memberSince)}</dd>
          </div>
        ) : null}
        {!member.phone && !member.email && !member.memberSince ? (
          <p className="text-ink-400">Sem dados de contato cadastrados.</p>
        ) : null}
      </dl>

      {member.roles.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
          {ecclesiastical.slice(0, 3).map((role) => (
            <Badge key={role.id} tone="gold">
              {role.title}
            </Badge>
          ))}
          {local.slice(0, 3).map((role) => (
            <Badge key={role.id} tone="brand">
              {role.title}
              {!role.endDate ? <span className="text-[10px] font-bold uppercase">ativo</span> : null}
            </Badge>
          ))}
          {member.roles.length > 6 ? <Badge>+{member.roles.length - 6}</Badge> : null}
        </div>
      ) : (
        <div className="mt-3 border-t border-line pt-3 text-xs text-ink-400">Nenhum cargo vinculado.</div>
      )}

      <div className="mt-auto flex items-center gap-2 pt-3.5">
        <Link href={`/membros/${member.id}`} className="btn btn-outline btn-sm flex-1">
          Ver cadastro
        </Link>
        <Link href={`/membros/${member.id}/editar`} className="icon-btn border border-line bg-white" aria-label={`Editar ${member.name}`}>
          <IconPencil size={16} />
        </Link>
        <button
          type="button"
          className="icon-btn border border-line bg-white text-danger hover:bg-danger-soft hover:text-danger"
          onClick={onDelete}
          aria-label={`Excluir ${member.name}`}
        >
          <IconTrash size={16} />
        </button>
      </div>
    </article>
  );
}

/** Placeholder reutilizável de carregamento para a página de membros. */
export function MembersLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-52 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
