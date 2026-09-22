import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { desc, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import {
  IconArrowLeft,
  IconCalendar,
  IconMail,
  IconMapPin,
  IconPhone,
  IconStar,
  IconUsers,
} from "@/components/icons";
import { HistoryTimeline } from "@/components/HistoryTimeline";
import { MemberActions } from "@/components/MemberActions";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, StatusBadge } from "@/components/ui/primitives";
import { ageFrom, formatDateBR, formatTimeBR, maskPhone, parseISODate } from "@/lib/format";

const MONTH_ABBR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
import { getMember, getMemberHistory } from "@/lib/repo";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = Number((await params).id);
  const member = Number.isInteger(id) ? await getMember(id) : null;
  return { title: member ? member.name : "Membro não encontrado" };
}

export default async function MemberProfilePage({ params }: Props) {
  await ensureSeed();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const member = await getMember(id);
  if (!member) notFound();

  const [history, participations] = await Promise.all([
    getMemberHistory(id),
    db
      .select()
      .from(services)
      .where(
        or(
          eq(services.preacherMemberId, id),
          eq(services.leader, member.name),
          eq(services.preacherName, member.name),
          sql`${services.singers}::text like ${`%${member.name}%`}`,
        ),
      )
      .orderBy(desc(services.serviceDate), desc(services.serviceTime))
      .limit(10),
  ]);

  const ecclesiastical = member.roles.filter((role) => role.kind === "eclesiastico");
  const local = member.roles.filter((role) => role.kind === "local");
  const age = ageFrom(member.birthDate);

  return (
    <>
      <PageHeader
        title={member.name}
        description="Ficha completa do membro: dados pessoais, cargos, participações na agenda e histórico auditável."
        breadcrumb={
          <Link href="/membros" className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-brand-700">
            <IconArrowLeft size={13} />
            Membros
          </Link>
        }
        actions={<MemberActions memberId={member.id} name={member.name} />}
      />

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        {/* Coluna resumo */}
        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="relative h-24 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-900 grain" />
            <div className="-mt-12 px-4 pb-4 sm:px-5">
              <Avatar src={member.photo} name={member.name} size="xl" className="ring-4 ring-white" />
              <h2 className="mt-3 font-display text-lg font-extrabold leading-tight text-ink-950">
                {member.name}
              </h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <StatusBadge kind="member" value={member.status} />
                {age !== null ? <Badge tone="neutral">{age} anos</Badge> : null}
                {member.kinship ? <Badge tone="brand">{member.kinship}</Badge> : null}
              </div>

              <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-sm">
                <ContactRow
                  icon={<IconPhone size={15} />}
                  label="Telefone"
                  value={member.phone ? maskPhone(member.phone) : null}
                  href={member.phone ? `tel:+55${member.phone.replace(/\D/g, "")}` : undefined}
                />
                <ContactRow
                  icon={<IconMail size={15} />}
                  label="E-mail"
                  value={member.email}
                  href={member.email ? `mailto:${member.email}` : undefined}
                />
                <ContactRow
                  icon={<IconMapPin size={15} />}
                  label="Endereço"
                  value={[member.address, member.city].filter(Boolean).join(" · ") || null}
                />
                <ContactRow
                  icon={<IconUsers size={15} />}
                  label="Família"
                  value={member.familyName}
                />
                <ContactRow
                  icon={<IconStar size={15} />}
                  label="Membro desde"
                  value={member.memberSince ? formatDateBR(member.memberSince) : null}
                />
                <ContactRow
                  icon={<IconCalendar size={15} />}
                  label="Batismo"
                  value={member.baptismDate ? formatDateBR(member.baptismDate) : null}
                />
                <ContactRow
                  icon={<IconCalendar size={15} />}
                  label="Nascimento"
                  value={member.birthDate ? formatDateBR(member.birthDate) : null}
                />
              </dl>

              {member.notes ? (
                <div className="mt-4 rounded-xl bg-surface-alt p-3.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                    Observações pastorais
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-ink-700">
                    {member.notes}
                  </p>
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <CardHeader
              icon={<IconCalendar size={18} />}
              title="Participações na agenda"
              subtitle="Cultos em que atuou como dirigente, pregador ou cantor."
            />
            <div className="divide-y divide-line">
              {participations.length === 0 ? (
                <EmptyState
                  title="Sem participações"
                  description="Escale este membro em um culto pela agenda."
                  className="py-8"
                />
              ) : (
                participations.map((service) => (
                  <Link
                    key={service.id}
                    href={`/agenda?destaque=${service.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-brand-50/50 sm:px-5"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-center font-display leading-none text-brand-700">
                      <span className="text-base font-extrabold">
                        {parseISODate(service.serviceDate)?.getDate() ?? "--"}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wide">
                        {MONTH_ABBR[parseISODate(service.serviceDate)?.getMonth() ?? 0]}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink-900">
                        {service.title}
                      </span>
                      <span className="block truncate text-xs text-ink-500">
                        {formatDateBR(service.serviceDate)} · {formatTimeBR(service.serviceTime)} ·{" "}
                        {service.kind ?? "Culto"}
                      </span>
                    </span>
                    <StatusBadge kind="service" value={service.status} />
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Coluna principal */}
        <div className="space-y-5">
          <Card>
            <CardHeader
              icon={<IconStar size={18} />}
              title="Cargos eclesiásticos"
              subtitle={`${ecclesiastical.length} consagração(ões) registrada(s).`}
            />
            <div className="px-4 py-4 sm:px-5">
              {ecclesiastical.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-500">
                  Nenhum cargo eclesiástico registrado.
                </p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {ecclesiastical.map((role) => (
                    <li
                      key={role.id}
                      className="rounded-xl border border-gold-200 bg-[#fdf9f0] p-3.5 transition hover:shadow-card"
                    >
                      <p className="font-display text-sm font-bold text-[#7a5a12]">{role.title}</p>
                      <p className="mt-1 text-xs text-ink-600">
                        Consagração:{" "}
                        <strong className="font-semibold text-ink-900">
                          {formatDateBR(role.consecrationDate)}
                        </strong>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              icon={<IconUsers size={18} />}
              title="Cargos locais"
              subtitle={`${local.length} função(ões) na congregação, com período de atuação.`}
            />
            <div className="px-4 py-4 sm:px-5">
              {local.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-500">
                  Nenhum cargo local registrado.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {local.map((role) => (
                    <li
                      key={role.id}
                      className="flex flex-col gap-2 rounded-xl border border-line bg-surface/60 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-bold text-ink-900">{role.title}</p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          {formatDateBR(role.startDate)} →{" "}
                          {role.endDate ? formatDateBR(role.endDate) : "atual"}
                        </p>
                      </div>
                      <Badge tone={role.endDate ? "neutral" : "success"}>
                        {role.endDate ? "Encerrado" : "Em exercício"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <HistoryTimeline memberId={member.id} initialHistory={history} />
        </div>
      </div>
    </>
  );
}

function ContactRow({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode;
  label: string;
  value?: string | null;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-ink-400">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-medium text-ink-400">{label}</dt>
        <dd className="truncate text-[13px] font-medium text-ink-800">
          {value ? (
            href ? (
              <a href={href} className="link">
                {value}
              </a>
            ) : (
              value
            )
          ) : (
            <span className="text-ink-300">não informado</span>
          )}
        </dd>
      </div>
    </div>
  );
}
