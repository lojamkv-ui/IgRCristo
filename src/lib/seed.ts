import { sql } from "drizzle-orm";
import { db } from "@/db";
import { memberHistory, memberRoles, members, services } from "@/db/schema";
import { getSettings } from "@/lib/church";
import { toISODate } from "@/lib/format";

let seedPromise: Promise<void> | null = null;

/** Desloca uma data em dias a partir de hoje (útil para a agenda de demonstração). */
function shiftDays(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Próximo dia da semana informado (0 = domingo). */
function nextWeekday(weekday: number, minDays = 0): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  let diff = (weekday - date.getDay() + 7) % 7;
  if (diff < minDays) diff += 7;
  date.setDate(date.getDate() + diff);
  return toISODate(date);
}

/**
 * Popula o banco com dados de demonstração na primeira execução.
 * É idempotente: só roda quando não há membros nem cultos cadastrados.
 */
async function runSeed(): Promise<void> {
  const [memberCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(members);
  const [serviceCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(services);

  if ((memberCount?.total ?? 0) > 0 || (serviceCount?.total ?? 0) > 0) return;

  const church = await getSettings();

  const createdMembers = await db
    .insert(members)
    .values([
      {
        name: "Wellington Felicio Vieira",
        photo: "/people/pastor.jpg",
        birthDate: "1978-04-12",
        gender: "Masculino",
        email: church.email,
        phone: "62991542563",
        address: "R Nicanor Albernaz, QD. 02 LT. 01",
        city: "Trindade - GO",
        kinship: "Cônjuge",
        familyName: "Família Vieira",
        baptismDate: "1998-06-14",
        memberSince: "1998-06-14",
        status: "ativo",
        notes: "Pastor presidente da sede. Responsável pela visão geral dos ministérios.",
      },
      {
        name: "Ana Paula Ribeiro",
        photo: "/people/cantora.jpg",
        birthDate: "1986-09-03",
        gender: "Feminino",
        email: "ana.ribeiro@example.com",
        phone: "62988112233",
        address: "Rua das Palmeiras, 145",
        city: "Trindade - GO",
        kinship: "Cônjuge",
        familyName: "Família Ribeiro",
        baptismDate: "2010-03-28",
        memberSince: "2010-01-10",
        status: "ativo",
        notes: "Coordena o ministério de louvor e o grupo de senhoras.",
      },
      {
        name: "Marcos Vinícius Andrade",
        photo: "/people/cantor.jpg",
        birthDate: "1994-01-25",
        gender: "Masculino",
        email: "marcos.andrade@example.com",
        phone: "62997445566",
        address: "Av. Presidente Vargas, 980",
        city: "Trindade - GO",
        kinship: "Filho(a)",
        familyName: "Família Andrade",
        baptismDate: "2012-11-04",
        memberSince: "2012-11-04",
        status: "ativo",
      },
      {
        name: "Juliana Castro Lima",
        birthDate: "1999-07-19",
        gender: "Feminino",
        email: "juliana.lima@example.com",
        phone: "62996330011",
        city: "Goiânia - GO",
        kinship: "Irmã(ã)",
        familyName: "Família Castro",
        baptismDate: "2018-04-01",
        memberSince: "2017-08-20",
        status: "ativo",
      },
      {
        name: "Roberto Nunes da Silva",
        birthDate: "1971-12-02",
        gender: "Masculino",
        phone: "62991220044",
        city: "Trindade - GO",
        kinship: "Sem parentesco",
        status: "visitante",
        notes: "Visitante assíduo, em acompanhamento pastoral.",
      },
    ])
    .returning();

  const [pastor, ana, marcos, juliana, roberto] = createdMembers;

  await db.insert(memberRoles).values([
    { memberId: pastor.id, kind: "eclesiastico", title: "Pastor", consecrationDate: "2009-03-15" },
    { memberId: pastor.id, kind: "eclesiastico", title: "Apóstolo", consecrationDate: "2018-08-04" },
    { memberId: pastor.id, kind: "local", title: "Presidente da Sede", startDate: "2009-03-15", endDate: null },
    { memberId: ana.id, kind: "eclesiastico", title: "Diaconisa", consecrationDate: "2016-11-20" },
    { memberId: ana.id, kind: "local", title: "Líder de Senhoras", startDate: "2018-02-01", endDate: null },
    { memberId: ana.id, kind: "local", title: "Regente de Coral", startDate: "2020-01-10", endDate: "2023-12-31" },
    { memberId: marcos.id, kind: "eclesiastico", title: "Diácono", consecrationDate: "2021-05-30" },
    { memberId: marcos.id, kind: "local", title: "Mídia e Transmissão", startDate: "2019-06-15", endDate: null },
    { memberId: juliana.id, kind: "local", title: "Ministério Infantil", startDate: "2022-03-06", endDate: null },
    { memberId: juliana.id, kind: "local", title: "Vocalista", startDate: "2023-01-15", endDate: null },
  ]);

  await db.insert(memberHistory).values([
    {
      memberId: pastor.id,
      type: "criado",
      description: "Cadastro criado com dados pastorais e de contato.",
      changes: [],
    },
    {
      memberId: pastor.id,
      type: "cargo_adicionado",
      description: "Cargo eclesiástico adicionado.",
      changes: [
        {
          key: "role:seed-1",
          field: "Cargo eclesiástico",
          before: null,
          after: "Apóstolo · consagrado em 04/08/2018",
        },
      ],
    },
    { memberId: ana.id, type: "criado", description: "Cadastro criado.", changes: [] },
    {
      memberId: ana.id,
      type: "atualizado",
      description: "Dados de contato atualizados.",
      changes: [
        { key: "phone", field: "Telefone", before: "(62) 98800-0000", after: "(62) 98811-2233" },
      ],
    },
    { memberId: marcos.id, type: "criado", description: "Cadastro criado.", changes: [] },
    { memberId: juliana.id, type: "criado", description: "Cadastro criado.", changes: [] },
    { memberId: roberto.id, type: "criado", description: "Cadastro de visitante criado.", changes: [] },
  ]);

  await db.insert(services).values([
    {
      title: "Culto de Celebração",
      kind: "Culto de Celebração",
      serviceDate: nextWeekday(0, 1),
      serviceTime: "19:00",
      leader: "Ana Paula Ribeiro",
      preacherName: "Pr. Wellington Felicio Vieira",
      preacherPhoto: "/people/pastor.jpg",
      preacherMemberId: pastor.id,
      singers: [
        { name: "Marcos Vinícius Andrade", photo: "/people/cantor.jpg", memberId: marcos.id },
        { name: "Juliana Castro Lima", photo: null, memberId: juliana.id },
      ],
      intercessors: ["Roberto Nunes da Silva", "Ana Paula Ribeiro"],
      theme: "Renascendo para uma nova história",
      scripture: "2 Coríntios 5.17",
      status: "agendado",
    },
    {
      title: "Santa Ceia do Senhor",
      kind: "Santa Ceia",
      serviceDate: shiftDays(12),
      serviceTime: "18:30",
      leader: "Marcos Vinícius Andrade",
      preacherName: "Pr. Wellington Felicio Vieira",
      preacherPhoto: "/people/pastor.jpg",
      preacherMemberId: pastor.id,
      singers: [{ name: "Ana Paula Ribeiro", photo: "/people/cantora.jpg", memberId: ana.id }],
      intercessors: ["Juliana Castro Lima"],
      theme: "Mesa preparada, coração restaurado",
      scripture: "1 Coríntios 11.23-26",
      status: "agendado",
    },
    {
      title: "Vigília de Oração",
      kind: "Vigília",
      serviceDate: shiftDays(20),
      serviceTime: "22:00",
      leader: "Roberto Nunes da Silva",
      preacherName: "Pr. Wellington Felicio Vieira",
      singers: [],
      intercessors: ["Ana Paula Ribeiro", "Marcos Vinícius Andrade", "Juliana Castro Lima"],
      theme: "Noite de clamor pela família",
      status: "agendado",
    },
    {
      title: "Culto de Doutrina",
      kind: "Culto de Doutrina",
      serviceDate: shiftDays(-6),
      serviceTime: "19:30",
      leader: "Juliana Castro Lima",
      preacherName: "Pr. Wellington Felicio Vieira",
      singers: [{ name: "Marcos Vinícius Andrade", photo: "/people/cantor.jpg" }],
      intercessors: ["Ana Paula Ribeiro"],
      scripture: "2 Timóteo 3.16",
      status: "realizado",
    },
  ]);
}

/** Garante execução única mesmo com múltiplas requisições simultâneas. */
export function ensureSeed(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((error) => {
      console.error("[seed] falha ao popular dados de demonstração:", error);
      seedPromise = null;
    });
  }
  return seedPromise;
}
