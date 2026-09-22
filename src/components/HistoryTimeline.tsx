"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  IconCamera,
  IconCheckCircle,
  IconHistory,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@/components/icons";
import { Card, CardHeader, EmptyState, Skeleton } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime, formatRelative } from "@/lib/format";
import { HISTORY_TYPES, type HistoryDTO } from "@/lib/types";

const TYPE_STYLE: Record<string, { icon: ReactNode; tone: string }> = {
  criado: { icon: <IconPlus size={15} />, tone: "bg-brand-500 text-white" },
  atualizado: { icon: <IconPencil size={15} />, tone: "bg-brand-100 text-brand-700" },
  foto: { icon: <IconCamera size={15} />, tone: "bg-[#fdf0dc] text-[#8a6412]" },
  cargo_adicionado: { icon: <IconCheckCircle size={15} />, tone: "bg-success-soft text-success" },
  cargo_atualizado: { icon: <IconRefresh size={15} />, tone: "bg-warning-soft text-warning" },
  cargo_removido: { icon: <IconTrash size={15} />, tone: "bg-danger-soft text-danger" },
  restaurado: { icon: <IconHistory size={15} />, tone: "bg-surface-alt text-ink-600" },
};

/**
 * Histórico completo de alterações do cadastro com filtro por tipo.
 * Cada entrada mostra data/hora, tipo, descrição e o antes/depois de cada campo.
 */
export function HistoryTimeline({
  memberId,
  initialHistory,
}: {
  memberId: number;
  initialHistory: HistoryDTO[];
}) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<HistoryDTO[]>(initialHistory);
  const [type, setType] = useState("todos");
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);
  const firstRun = useRef(true);

  const load = useCallback(
    async (nextType: string) => {
      const current = ++requestId.current;
      setLoading(true);
      try {
        const response = await api.members.history(memberId, nextType);
        if (current !== requestId.current) return;
        setEntries(response.data);
      } catch (error) {
        if (current === requestId.current) toast("error", "Falha ao carregar o histórico", errorMessage(error));
      } finally {
        if (current === requestId.current) setLoading(false);
      }
    },
    [memberId, toast],
  );

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    void load(type);
  }, [type, load]);

  return (
    <Card>
      <CardHeader
        icon={<IconHistory size={18} />}
        title="Histórico de alterações"
        subtitle={`${entries.length} registro(s)${type !== "todos" ? ` do tipo selecionado` : ""} · cada atualização guarda data, hora, tipo e os valores anteriores.`}
        action={
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load(type)} disabled={loading}>
            <IconRefresh size={15} />
            Atualizar
          </button>
        }
      />

      <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-3 sm:px-5">
        <FilterChip active={type === "todos"} onClick={() => setType("todos")} label="Todos" />
        {HISTORY_TYPES.map((item) => (
          <FilterChip
            key={item.value}
            active={type === item.value}
            onClick={() => setType(item.value)}
            label={item.label}
          />
        ))}
      </div>

      <div className="px-4 py-4 sm:px-5">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<IconHistory size={22} />}
            title="Nenhuma alteração registrada"
            description={
              type === "todos"
                ? "Assim que o cadastro for atualizado, o histórico aparecerá aqui."
                : "Nenhum registro para o filtro selecionado."
            }
          />
        ) : (
          <ol className="relative space-y-5 border-l border-line pl-6">
            {entries.map((entry) => {
              const style = TYPE_STYLE[entry.type] ?? TYPE_STYLE.restaurado;
              const changes = Array.isArray(entry.changes) ? entry.changes : [];
              return (
                <li key={entry.id} className="relative">
                  <span
                    className={`absolute -left-[35px] grid h-8 w-8 place-items-center rounded-full ring-4 ring-white ${style.tone}`}
                    aria-hidden="true"
                  >
                    {style.icon}
                  </span>
                  <div className="rounded-xl border border-line bg-surface/50 p-3.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="font-display text-sm font-bold text-ink-900">{entry.description}</p>
                      <time
                        className="shrink-0 text-xs font-medium text-ink-400"
                        dateTime={new Date(entry.createdAt).toISOString()}
                        title={formatDateTime(entry.createdAt)}
                      >
                        {formatDateTime(entry.createdAt)} · {formatRelative(entry.createdAt)}
                      </time>
                    </div>

                    {changes.length > 0 ? (
                      <ul className="mt-2.5 space-y-1.5">
                        {changes.map((change, index) => (
                          <li
                            key={`${entry.id}-${index}`}
                            className="flex flex-col gap-1 rounded-lg bg-white px-3 py-2 text-[13px] ring-1 ring-line sm:flex-row sm:items-center sm:gap-3"
                          >
                            <span className="shrink-0 font-semibold text-ink-700 sm:w-44">{change.field}</span>
                            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                              <span className="max-w-full truncate rounded-md bg-danger-soft px-2 py-0.5 text-danger line-through decoration-danger/40">
                                {change.before ?? "vazio"}
                              </span>
                              <span className="text-ink-400" aria-hidden="true">
                                →
                              </span>
                              <span className="max-w-full truncate rounded-md bg-success-soft px-2 py-0.5 text-success">
                                {change.after ?? "removido"}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Card>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-brand-600 bg-brand-600 text-white shadow-sm"
          : "border-line bg-white text-ink-600 hover:border-brand-300 hover:text-brand-700"
      }`}
    >
      {label}
    </button>
  );
}
