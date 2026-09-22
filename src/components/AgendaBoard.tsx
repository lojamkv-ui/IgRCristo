"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconCalendar,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconHands,
  IconMusic,
  IconPencil,
  IconPlus,
  IconSearch,
  IconSparkles,
  IconTrash,
  IconUsers,
  IconX,
} from "@/components/icons";
import { FlyerDialog } from "@/components/FlyerDialog";
import { ConfirmDialog } from "@/components/ui/Modal";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Segmented,
  Select,
  StatusBadge,
  TableSkeleton,
  TextInput,
} from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/api";
import {
  daysUntil,
  formatDateBR,
  formatTimeBR,
  parseISODate,
  toISODate,
  whenLabel,
} from "@/lib/format";
import { SERVICE_STATUS, type ServiceDTO } from "@/lib/types";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

type DayCell = { iso: string; day: number; inMonth: boolean; services: ServiceDTO[] };

function buildMonthGrid(cursor: Date, services: ServiceDTO[]): DayCell[][] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());

  const byDate = new Map<string, ServiceDTO[]>();
  services.forEach((service) => {
    const list = byDate.get(service.serviceDate) ?? [];
    list.push(service);
    byDate.set(service.serviceDate, list);
  });

  const weeks: DayCell[][] = [];
  const current = new Date(start);
  for (let week = 0; week < 6; week += 1) {
    const days: DayCell[] = [];
    for (let day = 0; day < 7; day += 1) {
      const iso = toISODate(current);
      days.push({
        iso,
        day: current.getDate(),
        inMonth: current.getMonth() === cursor.getMonth(),
        services: byDate.get(iso) ?? [],
      });
      current.setDate(current.getDate() + 1);
    }
    weeks.push(days);
  }
  return weeks;
}

export function AgendaBoard({
  initialServices,
  highlightId,
}: {
  initialServices: ServiceDTO[];
  highlightId?: number;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [services, setServices] = useState<ServiceDTO[]>(initialServices);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"lista" | "mes">("lista");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("todos");
  const [cursor, setCursor] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [flyerTarget, setFlyerTarget] = useState<ServiceDTO | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ServiceDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ------------------------------- busca ------------------------------- */
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);

    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await api.services.list({
          q: query || undefined,
          status: status !== "todos" ? status : undefined,
        });
        setServices(response.data);
      } catch (error) {
        toast("error", "Falha ao carregar a agenda", errorMessage(error));
      } finally {
        setLoading(false);
      }
    }, query ? 320 : 0);

    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status]);

  /* --------------------- destaque de culto recém-criado ---------------- */
  useEffect(() => {
    if (!highlightId) return;
    const element = document.getElementById(`culto-${highlightId}`);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, services]);

  const weeks = useMemo(() => buildMonthGrid(cursor, services), [cursor, services]);

  const visible = useMemo(() => {
    const list = selectedDay ? services.filter((service) => service.serviceDate === selectedDay) : services;
    return [...list].sort((a, b) =>
      `${a.serviceDate}${a.serviceTime}`.localeCompare(`${b.serviceDate}${b.serviceTime}`),
    );
  }, [services, selectedDay]);

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.services.remove(pendingDelete.id);
      setServices((current) => current.filter((service) => service.id !== pendingDelete.id));
      toast("success", "Culto excluído", `“${pendingDelete.title}” foi removido da agenda.`);
      setPendingDelete(null);
      router.refresh();
    } catch (error) {
      toast("error", "Não foi possível excluir", errorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  function moveMonth(delta: number) {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
    setSelectedDay(null);
  }

  const todayISOValue = toISODate(new Date());

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card>
        <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:p-4">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
              <IconSearch size={18} />
            </span>
            <TextInput
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por título, dirigente, pregador, tema ou tipo de culto…"
              className="pl-11"
              aria-label="Buscar cultos"
            />
            {query ? (
              <button
                type="button"
                className="icon-btn absolute right-1.5 top-1/2 h-8 w-8 -translate-y-1/2"
                onClick={() => setQuery("")}
                aria-label="Limpar busca"
              >
                <IconX size={15} />
              </button>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="sm:w-44"
              aria-label="Filtrar por situação"
            >
              <option value="todos">Todas as situações</option>
              {SERVICE_STATUS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: "lista", label: "Lista" },
                { value: "mes", label: "Mês" },
              ]}
            />
            <Link href="/agenda/novo" className="btn btn-primary">
              <IconPlus size={16} />
              Novo culto
            </Link>
          </div>
        </div>
      </Card>

      {view === "mes" ? (
        <Card>
          <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
            <div className="flex items-center gap-1">
              <button type="button" className="icon-btn border border-line" onClick={() => moveMonth(-1)} aria-label="Mês anterior">
                <IconChevronLeft size={17} />
              </button>
              <button type="button" className="icon-btn border border-line" onClick={() => moveMonth(1)} aria-label="Próximo mês">
                <IconChevronRight size={17} />
              </button>
            </div>
            <p className="font-display text-sm font-bold text-ink-900 sm:text-base">
              {MONTHS[cursor.getMonth()]} de {cursor.getFullYear()}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const today = new Date();
                setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
                setSelectedDay(todayISOValue);
              }}
            >
              Hoje
            </Button>
          </div>

          <div className="grid grid-cols-7 border-b border-line bg-surface/70 text-center text-[11px] font-bold uppercase tracking-wide text-ink-500">
            {WEEKDAYS.map((day) => (
              <span key={day} className="px-1 py-2">
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {weeks.flat().map((cell) => {
              const isToday = cell.iso === todayISOValue;
              const isSelected = cell.iso === selectedDay;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => {
                    setSelectedDay(isSelected ? null : cell.iso);
                    setView("lista");
                  }}
                  className={`min-h-[74px] border-b border-r border-line/70 p-1.5 text-left transition sm:min-h-[96px] sm:p-2 ${
                    cell.inMonth ? "bg-white" : "bg-surface/50"
                  } ${isSelected ? "ring-2 ring-inset ring-brand-500" : "hover:bg-brand-50/60"} ${
                    isToday ? "bg-brand-50" : ""
                  }`}
                  aria-label={`${formatDateBR(cell.iso)} — ${cell.services.length} culto(s)`}
                >
                  <span
                    className={`inline-grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${
                      isToday
                        ? "bg-brand-600 text-white"
                        : cell.inMonth
                          ? "text-ink-700"
                          : "text-ink-300"
                    }`}
                  >
                    {cell.day}
                  </span>
                  <span className="mt-1 block space-y-1">
                    {cell.services.slice(0, 2).map((service) => (
                      <span
                        key={service.id}
                        className={`block truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold leading-tight ${
                          service.status === "cancelado"
                            ? "bg-danger-soft text-danger line-through"
                            : service.status === "realizado"
                              ? "bg-success-soft text-success"
                              : "bg-brand-100 text-brand-800"
                        }`}
                      >
                        {formatTimeBR(service.serviceTime)} {service.title}
                      </span>
                    ))}
                    {cell.services.length > 2 ? (
                      <span className="block px-1.5 text-[10px] font-semibold text-ink-400">
                        +{cell.services.length - 2}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-[11px] text-ink-500 sm:px-5">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-400" /> Agendado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-success" /> Realizado
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-danger" /> Cancelado
            </span>
            <span className="ml-auto">Toque em um dia para ver os cultos na lista.</span>
          </div>
        </Card>
      ) : null}

      {/* Lista */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-500" aria-live="polite">
          {loading ? (
            "Carregando agenda…"
          ) : (
            <>
              <strong className="font-display text-ink-900">{visible.length}</strong>{" "}
              {visible.length === 1 ? "culto listado" : "cultos listados"}
              {selectedDay ? ` em ${formatDateBR(selectedDay)}` : ""}
            </>
          )}
        </p>
        {selectedDay ? (
          <button type="button" className="link text-xs" onClick={() => setSelectedDay(null)}>
            Ver todos os cultos
          </button>
        ) : null}
      </div>

      {loading ? (
        <Card>
          <TableSkeleton rows={4} />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconCalendar size={24} />}
            title="Nenhum culto encontrado"
            description="Agende o próximo culto para montar a escala ministerial e gerar o flyer de divulgação."
            action={
              <Link href="/agenda/novo" className="btn btn-primary">
                <IconPlus size={16} />
                Agendar culto
              </Link>
            }
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          {visible.map((service) => {
            const days = daysUntil(service.serviceDate);
            const isHighlighted = highlightId === service.id;
            return (
              <li key={service.id}>
                <article
                  id={`culto-${service.id}`}
                  className={`card overflow-hidden transition duration-200 hover:shadow-pop ${
                    isHighlighted ? "ring-2 ring-brand-400" : ""
                  }`}
                >
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
                    {/* Data */}
                    <div className="flex shrink-0 items-center gap-3 sm:w-[104px] sm:flex-col sm:items-center sm:gap-1">
                      <div
                        className={`grid h-16 w-16 place-items-center rounded-2xl text-center ${
                          service.status === "cancelado"
                            ? "bg-danger-soft text-danger"
                            : days !== null && days >= 0
                              ? "bg-brand-600 text-white"
                              : "bg-surface-alt text-ink-600"
                        }`}
                      >
                        <span className="font-display text-xl font-extrabold leading-none">
                          {parseISODate(service.serviceDate)?.getDate()}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider">
                          {MONTHS[parseISODate(service.serviceDate)?.getMonth() ?? 0].slice(0, 3)}
                        </span>
                      </div>
                      <div className="text-center sm:mt-1">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">
                          {whenLabel(service.serviceDate)}
                        </p>
                        <p className="flex items-center justify-center gap-1 text-[11px] text-ink-400">
                          <IconClock size={11} />
                          {formatTimeBR(service.serviceTime)}
                        </p>
                      </div>
                    </div>

                    {/* Conteúdo */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-base font-bold text-ink-950 sm:text-lg">
                          {service.title}
                        </h3>
                        <StatusBadge kind="service" value={service.status} />
                        {service.kind ? <Badge tone="neutral">{service.kind}</Badge> : null}
                      </div>
                      {service.theme ? (
                        <p className="mt-0.5 text-[13px] italic text-ink-500">“{service.theme}”</p>
                      ) : null}

                      <dl className="mt-3 grid gap-2.5 sm:grid-cols-2">
                        <div className="flex items-center gap-2 text-[13px] text-ink-700">
                          <IconUsers size={14} className="shrink-0 text-brand-500" />
                          <dt className="sr-only">Dirigente</dt>
                          <dd className="truncate">
                            <span className="text-ink-400">Dirigente:</span> {service.leader}
                          </dd>
                        </div>
                        <div className="flex items-center gap-2 text-[13px] text-ink-700">
                          <Avatar src={service.preacherPhoto} name={service.preacherName ?? "Pregador"} size="xs" />
                          <dt className="sr-only">Pregador</dt>
                          <dd className="truncate">
                            <span className="text-ink-400">Pregador:</span>{" "}
                            {service.preacherName ?? "a confirmar"}
                          </dd>
                        </div>
                        {service.singers.length > 0 ? (
                          <div className="flex items-center gap-2 text-[13px] text-ink-700">
                            <IconMusic size={14} className="shrink-0 text-brand-500" />
                            <dt className="sr-only">Cantores</dt>
                            <dd className="flex min-w-0 items-center gap-1.5">
                              <span className="flex -space-x-2">
                                {service.singers.slice(0, 4).map((singer) => (
                                  <Avatar key={singer.name} src={singer.photo} name={singer.name} size="xs" />
                                ))}
                              </span>
                              <span className="truncate">
                                {service.singers.map((singer) => singer.name).join(", ")}
                              </span>
                            </dd>
                          </div>
                        ) : null}
                        {service.intercessors.length > 0 ? (
                          <div className="flex items-center gap-2 text-[13px] text-ink-700">
                            <IconHands size={14} className="shrink-0 text-brand-500" />
                            <dt className="sr-only">Intercessores</dt>
                            <dd className="truncate">{service.intercessors.join(", ")}</dd>
                          </div>
                        ) : null}
                      </dl>
                    </div>

                    {/* Ações */}
                    <div className="flex shrink-0 flex-row gap-2 sm:flex-col sm:items-stretch">
                      <Button type="button" variant="gold" size="sm" onClick={() => setFlyerTarget(service)}>
                        <IconSparkles size={15} />
                        Criar no Canva
                      </Button>
                      <div className="flex gap-2">
                        <Link href={`/agenda/${service.id}/editar`} className="btn btn-outline btn-sm flex-1">
                          <IconPencil size={15} />
                          Editar
                        </Link>
                        <button
                          type="button"
                          className="icon-btn border border-line text-danger hover:bg-danger-soft"
                          onClick={() => setPendingDelete(service)}
                          aria-label={`Excluir ${service.title}`}
                        >
                          <IconTrash size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}

      {flyerTarget ? (
        <FlyerDialog
          key={flyerTarget.id}
          open
          onClose={() => setFlyerTarget(null)}
          service={flyerTarget}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Excluir culto da agenda"
        loading={deleting}
        confirmLabel="Excluir culto"
        message={
          <>
            Tem certeza que deseja excluir <strong>{pendingDelete?.title}</strong> de{" "}
            {pendingDelete ? formatDateBR(pendingDelete.serviceDate) : ""}?
            <br />
            A escala ministerial e o flyer gerado serão perdidos.
          </>
        }
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
