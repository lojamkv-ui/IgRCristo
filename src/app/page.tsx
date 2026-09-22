import Link from "next/link";
import type { ReactNode } from "react";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { activityLog } from "@/db/schema";
import {
  IconCalendar,
  IconChevronRight,
  IconClock,
  IconHistory,
  IconSparkles,
  IconStar,
  IconUserPlus,
  IconUsers,
} from "@/components/icons";
import { Avatar, Badge, Card, CardHeader, EmptyState, StatusBadge } from "@/components/ui/primitives";
import { getSettings } from "@/lib/church";
import { formatDateBR, formatLongDate, formatRelative, formatTimeBR, whenLabel } from "@/lib/format";
import { getStats, listMembers, listServices } from "@/lib/repo";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  await ensureSeed();

  const [settings, stats, upcoming, recentMembers, activity] = await Promise.all([
    getSettings(),
    getStats(),
    listServices({ upcoming: true, limit: 4 }),
    listMembers({ sort: "recent" }),
    db.select().from(activityLog).orderBy(desc(activityLog.createdAt), desc(activityLog.id)).limit(8),
  ]);

  const next = stats.nextService;
  const latestMembers = recentMembers.slice(0, 6);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-950 via-brand-800 to-brand-700 p-6 text-white shadow-pop sm:p-8">
        <div className="grain absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">{settings.churchName}</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
              Gestão de membros e agenda de cultos
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-brand-100/90 sm:text-[15px]">
              Cadastre pessoas com foto, cargos e parentesco, acompanhe cada alteração no histórico e
              publique flyers profissionais dos cultos em segundos.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/membros/novo" className="btn btn-gold">
                <IconUserPlus size={17} />
                Cadastrar membro
              </Link>
              <Link href="/agenda/novo" className="btn border border-white/20 bg-white/10 text-white hover:bg-white/20">
                <IconCalendar size={17} />
                Agendar culto
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm sm:p-5">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-gold-300">
              <IconClock size={14} />
              Próximo culto
            </p>
            {next ? (
              <>
                <p className="mt-2 font-display text-xl font-extrabold leading-tight">{next.title}</p>
                <p className="mt-1 text-sm text-brand-100">
                  {formatLongDate(next.serviceDate)} · {formatTimeBR(next.serviceTime)}
                </p>
                <dl className="mt-3 space-y-1 text-[13px] text-brand-100/90">
                  <div className="flex justify-between gap-3">
                    <dt className="text-brand-200/80">Dirigente</dt>
                    <dd className="truncate font-medium text-white">{next.leader}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-brand-200/80">Pregador</dt>
                    <dd className="truncate font-medium text-white">{next.preacherName ?? "a confirmar"}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-brand-200/80">Louvor</dt>
                    <dd className="truncate font-medium text-white">
                      {next.singers.map((singer) => singer.name).join(", ") || "—"}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <Badge tone="gold">{whenLabel(next.serviceDate)}</Badge>
                  <Link href={`/agenda?destaque=${next.id}`} className="btn btn-sm bg-white text-brand-800 hover:bg-brand-50">
                    <IconSparkles size={15} />
                    Gerar flyer
                  </Link>
                </div>
              </>
            ) : (
              <div className="mt-3">
                <p className="text-sm text-brand-100">Nenhum culto agendado.</p>
                <Link href="/agenda/novo" className="link mt-2 inline-block text-gold-300">
                  Agendar agora →
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Indicadores */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Membros cadastrados" value={stats.totalMembers} detail={`${stats.activeMembers} ativos · ${stats.visitors} visitantes`} icon={<IconUsers size={18} />} href="/membros" />
        <Stat label="Cargos vinculados" value={stats.totalRoles} detail={`${stats.ecclesiasticalRoles} eclesiásticos · ${stats.localRoles} locais`} icon={<IconStar size={18} />} href="/membros" />
        <Stat label="Cultos agendados" value={stats.upcomingServices} detail={`${stats.totalServices} na agenda no total`} icon={<IconCalendar size={18} />} href="/agenda" />
        <Stat label="Registros de histórico" value={stats.historyEntries} detail="alterações auditadas nos cadastros" icon={<IconHistory size={18} />} href="/membros" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Próximos cultos */}
        <Card>
          <CardHeader
            icon={<IconCalendar size={18} />}
            title="Próximos cultos"
            subtitle="Escala ministerial das próximas datas."
            action={
              <Link href="/agenda" className="btn btn-ghost btn-sm">
                Ver agenda
                <IconChevronRight size={15} />
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <EmptyState title="Sem cultos futuros" description="Agende o próximo culto pela agenda." className="py-10" />
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map((service) => (
                <li key={service.id}>
                  <Link href={`/agenda?destaque=${service.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-brand-50/50 sm:px-5">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-600 text-center text-white">
                      <span className="font-display text-base font-extrabold leading-none">
                        {formatDateBR(service.serviceDate).slice(0, 2)}
                      </span>
                      <span className="text-[10px] font-bold uppercase leading-none">
                        {formatLongDate(service.serviceDate).split(" de ")[1]?.slice(0, 3)}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink-900">{service.title}</span>
                      <span className="block truncate text-xs text-ink-500">
                        {formatTimeBR(service.serviceTime)} · Dirigente: {service.leader}
                        {service.preacherName ? ` · Pregador: ${service.preacherName}` : ""}
                      </span>
                    </span>
                    <StatusBadge kind="service" value={service.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Membros recentes */}
        <Card>
          <CardHeader
            icon={<IconUsers size={18} />}
            title="Cadastros atualizados recentemente"
            action={
              <Link href="/membros" className="btn btn-ghost btn-sm">
                Ver todos
                <IconChevronRight size={15} />
              </Link>
            }
          />
          {latestMembers.length === 0 ? (
            <EmptyState title="Nenhum membro" description="Cadastre o primeiro membro da igreja." className="py-10" />
          ) : (
            <ul className="divide-y divide-line">
              {latestMembers.map((member) => (
                <li key={member.id}>
                  <Link href={`/membros/${member.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-brand-50/50 sm:px-5">
                    <Avatar src={member.photo} name={member.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink-900">{member.name}</span>
                      <span className="block truncate text-xs text-ink-500">
                        {member.roles.map((role) => role.title).slice(0, 3).join(" · ") || "Sem cargos"}
                        {member.kinship ? ` · ${member.kinship}` : ""}
                      </span>
                    </span>
                    <span className="hidden text-[11px] text-ink-400 sm:block">{formatRelative(member.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Atividade */}
      <Card>
        <CardHeader icon={<IconHistory size={18} />} title="Atividade recente" subtitle="Últimos eventos registrados no sistema." />
        {activity.length === 0 ? (
          <EmptyState title="Sem atividade" className="py-8" />
        ) : (
          <ul className="divide-y divide-line">
            {activity.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 px-4 py-3 sm:px-5">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-400" aria-hidden="true" />
                <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink-700">{entry.description}</p>
                <time className="shrink-0 text-[11px] text-ink-400" dateTime={new Date(entry.createdAt).toISOString()}>
                  {formatRelative(entry.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  detail,
  icon,
  href,
}: {
  label: string;
  value: number;
  detail: string;
  icon: ReactNode;
  href: string;
}) {
  return (
    <Link href={href} className="card group flex items-start gap-3 p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-pop">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-display text-2xl font-extrabold leading-none text-ink-950">{value}</span>
        <span className="mt-1 block text-[13px] font-semibold text-ink-700">{label}</span>
        <span className="block truncate text-[11px] text-ink-400">{detail}</span>
      </span>
    </Link>
  );
}
