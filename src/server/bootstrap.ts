import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { churchProfile, ecclesiasticalOffices, localOffices, memberHistory, members, serviceParticipants, services } from "@/db/schema";
import { CHURCH_DEFAULTS } from "@/lib/constants";
import { addDays, nextWeekday, saoPauloToday } from "@/lib/format";

const globalSeed = globalThis as typeof globalThis & { __renascendoSeed?: Promise<void> };

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86400000);
}

export function bootstrap() {
  if (!globalSeed.__renascendoSeed) {
    globalSeed.__renascendoSeed = run().catch((error) => {
      globalSeed.__renascendoSeed = undefined;
      throw error;
    });
  }
  return globalSeed.__renascendoSeed;
}

async function run() {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(87423101)`);
    let [profile] = await tx.select().from(churchProfile).where(eq(churchProfile.id, 1));
    if (!profile) {
      [profile] = await tx.insert(churchProfile).values({ id: 1, ...CHURCH_DEFAULTS, demoSeeded: false }).returning();
    }
    if (!profile || profile.demoSeeded) return;
    const [existing] = await tx.select({ id: members.id }).from(members).limit(1);
    if (existing) {
      await tx.update(churchProfile).set({ demoSeeded: true }).where(eq(churchProfile.id, 1));
      return;
    }

    const today = saoPauloToday();
    const month = today.slice(5, 7);
    const day = Number(today.slice(8, 10));
    const otherDay = String(Math.min(day > 4 ? day - 3 : day + 6, 28)).padStart(2, "0");
    const created = await tx
      .insert(members)
      .values([
        {
          fullName: "Wellington Felicio Vieira",
          photo: "/portraits/wellington.jpg",
          birthDate: "1974-08-16",
          gender: "Masculino",
          maritalStatus: "Casado(a)",
          phone: "(62) 99154-2563",
          email: "wellington.felicio@example.com",
          address: "R. Nicanor Albernaz, Qd. 02, Lt. 08",
          neighborhood: "Setor Cristina",
          city: "Trindade",
          baptismDate: "1990-03-12",
          conversionDate: "1989-11-02",
          memberSince: "1998-08-16",
          status: "ativo",
          notes: "Pastor presidente da sede. Contato oficial da igreja.",
          createdAt: daysAgo(140),
          updatedAt: daysAgo(12),
        },
        {
          fullName: "Márcia Helena Vieira",
          photo: "/portraits/marcia.jpg",
          birthDate: "1976-09-02",
          gender: "Feminino",
          maritalStatus: "Casado(a)",
          phone: "(62) 99210-4481",
          email: "marcia.vieira@example.com",
          address: "R. Nicanor Albernaz, Qd. 02, Lt. 08",
          neighborhood: "Setor Cristina",
          city: "Trindade",
          baptismDate: "1994-06-19",
          conversionDate: "1993-12-05",
          memberSince: "1998-08-16",
          status: "ativo",
          notes: "Acompanha o ministério de mulheres e a recepção das famílias novas.",
          createdAt: daysAgo(140),
          updatedAt: daysAgo(20),
        },
        {
          fullName: "André Luiz Campos",
          photo: "/portraits/andre.jpg",
          birthDate: `1991-${month}-${today.slice(8, 10)}`,
          gender: "Masculino",
          maritalStatus: "Casado(a)",
          phone: "(62) 98411-2209",
          address: "Rua 12, Qd. 18, Lt. 04",
          neighborhood: "Setor Maysa",
          city: "Trindade",
          baptismDate: "2008-04-20",
          conversionDate: "2007-09-14",
          memberSince: "2011-02-06",
          status: "ativo",
          createdAt: daysAgo(90),
          updatedAt: daysAgo(4),
        },
        {
          fullName: "Beatriz Nogueira",
          photo: "/portraits/beatriz.jpg",
          birthDate: "1999-07-22",
          gender: "Feminino",
          maritalStatus: "Solteiro(a)",
          phone: "(62) 99330-1184",
          email: "beatriz.louvor@example.com",
          address: "Av. Trindade, 410",
          neighborhood: "Centro",
          city: "Trindade",
          baptismDate: "2014-11-09",
          conversionDate: "2014-05-18",
          memberSince: "2015-01-11",
          status: "ativo",
          notes: "Regente do louvor aos domingos.",
          createdAt: daysAgo(80),
          updatedAt: daysAgo(5),
        },
        {
          fullName: "Lucas Henrique Dias",
          photo: "/portraits/lucas.jpg",
          birthDate: "1996-02-14",
          gender: "Masculino",
          maritalStatus: "Solteiro(a)",
          phone: "(62) 98502-7730",
          address: "Rua das Acácias, Qd. 07, Lt. 15",
          neighborhood: "Setor Cristina",
          city: "Trindade",
          baptismDate: "2016-08-28",
          conversionDate: "2016-03-03",
          memberSince: "2017-04-02",
          status: "ativo",
          createdAt: daysAgo(70),
          updatedAt: daysAgo(9),
        },
        {
          fullName: "Rosa Maria Alves",
          photo: "/portraits/rosa.jpg",
          birthDate: "1962-12-03",
          gender: "Feminino",
          maritalStatus: "Viúvo(a)",
          phone: "(62) 98120-5561",
          address: "Rua 4, Qd. 09, Lt. 02",
          neighborhood: "Setor Cristina",
          city: "Trindade",
          baptismDate: "1984-05-06",
          conversionDate: "1983-10-16",
          memberSince: "1999-03-21",
          status: "ativo",
          notes: "Coordena o grupo de intercessão das terças, às 6h.",
          createdAt: daysAgo(130),
          updatedAt: daysAgo(15),
        },
        {
          fullName: "Paulo César Mendes",
          photo: "/portraits/paulo.jpg",
          birthDate: "1980-10-27",
          gender: "Masculino",
          maritalStatus: "Casado(a)",
          phone: "(62) 99914-6620",
          email: "paulo.tesouraria@example.com",
          address: "Rua 21, Qd. 30, Lt. 11",
          neighborhood: "Vila Padre Pelágio",
          city: "Trindade",
          baptismDate: "2001-09-09",
          conversionDate: "2000-12-24",
          memberSince: "2006-01-15",
          status: "ativo",
          createdAt: daysAgo(110),
          updatedAt: daysAgo(30),
        },
        {
          fullName: "Helena Souza",
          photo: "/portraits/helena.jpg",
          birthDate: `2004-${month}-${otherDay}`,
          gender: "Feminino",
          maritalStatus: "Solteiro(a)",
          phone: "(62) 99288-0144",
          address: "Rua 4, Qd. 09, Lt. 02",
          neighborhood: "Setor Cristina",
          city: "Trindade",
          baptismDate: "2018-12-16",
          conversionDate: "2018-06-10",
          memberSince: "2019-02-03",
          status: "ativo",
          createdAt: daysAgo(40),
          updatedAt: daysAgo(8),
        },
        {
          fullName: "Samuel Vieira",
          birthDate: "2001-11-30",
          gender: "Masculino",
          maritalStatus: "Solteiro(a)",
          phone: "(62) 99440-2291",
          address: "R. Nicanor Albernaz, Qd. 02, Lt. 08",
          neighborhood: "Setor Cristina",
          city: "Trindade",
          baptismDate: "2016-04-17",
          conversionDate: "2015-08-23",
          memberSince: "2016-04-17",
          status: "ativo",
          notes: "Foto ainda não enviada.",
          createdAt: daysAgo(60),
          updatedAt: daysAgo(6),
        },
        {
          fullName: "Joana Ribeiro",
          birthDate: "2006-05-09",
          gender: "Feminino",
          maritalStatus: "Solteiro(a)",
          phone: "(62) 98817-3340",
          address: "Rua 8, Qd. 14, Lt. 20",
          neighborhood: "Setor Central",
          city: "Goiânia",
          memberSince: "2025-03-01",
          status: "congregado",
          notes: "Congregada recente. Frequenta a recepção aos domingos.",
          createdAt: daysAgo(25),
          updatedAt: daysAgo(2),
        },
      ])
      .returning({ id: members.id, fullName: members.fullName });

    const idOf = (name: string) => {
      const found = created.find((person) => person.fullName === name);
      if (!found) throw new Error(`Membro de demonstração ausente: ${name}`);
      return found.id;
    };
    const wellington = idOf("Wellington Felicio Vieira");
    const marcia = idOf("Márcia Helena Vieira");
    const andre = idOf("André Luiz Campos");
    const beatriz = idOf("Beatriz Nogueira");
    const lucas = idOf("Lucas Henrique Dias");
    const rosa = idOf("Rosa Maria Alves");
    const paulo = idOf("Paulo César Mendes");
    const helena = idOf("Helena Souza");
    const samuel = idOf("Samuel Vieira");
    const joana = idOf("Joana Ribeiro");

    await tx.update(members).set({ kinshipType: "conjuge", kinshipMemberId: marcia }).where(eq(members.id, wellington));
    await tx.update(members).set({ kinshipType: "conjuge", kinshipMemberId: wellington }).where(eq(members.id, marcia));
    await tx.update(members).set({ kinshipType: "filho", kinshipMemberId: wellington, kinshipNotes: "Filho do casal pastoral." }).where(eq(members.id, samuel));
    await tx.update(members).set({ kinshipType: "filho", kinshipMemberId: rosa }).where(eq(members.id, helena));
    await tx.update(members).set({ kinshipType: "primo", kinshipMemberId: beatriz, kinshipNotes: "Vem de Goiânia aos domingos." }).where(eq(members.id, joana));

    await tx.insert(ecclesiasticalOffices).values([
      { memberId: wellington, title: "Pastor Presidente", consecrationDate: "1998-08-16", notes: "Consagração na sede." },
      { memberId: marcia, title: "Pastora", consecrationDate: "2004-11-07" },
      { memberId: andre, title: "Evangelista", consecrationDate: "2015-06-21" },
      { memberId: lucas, title: "Diácono", consecrationDate: "2021-09-12" },
      { memberId: rosa, title: "Diaconisa", consecrationDate: "2010-04-04" },
      { memberId: paulo, title: "Presbítero", consecrationDate: "2012-10-14" },
      { memberId: samuel, title: "Cooperador", consecrationDate: "2024-08-18" },
    ]);
    await tx.insert(localOffices).values([
      { memberId: marcia, title: "Líder de mulheres", startDate: "2016-02-01" },
      { memberId: andre, title: "Líder de jovens", startDate: "2022-01-10" },
      { memberId: beatriz, title: "Regente de louvor", startDate: "2023-03-01" },
      { memberId: lucas, title: "Sonoplasta", startDate: "2020-05-01" },
      { memberId: lucas, title: "Músico", startDate: "2019-02-17" },
      { memberId: rosa, title: "Intercessor", startDate: "2008-01-01" },
      { memberId: paulo, title: "Secretário", startDate: "2014-02-01", endDate: "2018-12-31" },
      { memberId: paulo, title: "Tesoureiro", startDate: "2019-01-07" },
      { memberId: helena, title: "Professor da EBD", startDate: "2024-02-11" },
      { memberId: samuel, title: "Músico", startDate: "2023-01-15" },
      { memberId: joana, title: "Recepção", startDate: "2025-03-01" },
    ]);

    const sunday = nextWeekday(today, 0);
    const wednesday = nextWeekday(today, 3);
    const friday = nextWeekday(today, 5);
    const santaCeia = addDays(sunday, 7);
    const past = addDays(sunday, -7);
    const insertedServices = await tx
      .insert(services)
      .values([
        {
          serviceDate: sunday,
          serviceTime: "18:30",
          title: "Culto de Celebração",
          theme: "Servir com alegria",
          leaderId: wellington,
          leaderName: "Pr. Wellington Felicio Vieira",
          preacherId: andre,
          preacherName: "Ev. André Luiz Campos",
          notes: "Abertura dos portões às 18h.",
          createdAt: daysAgo(6),
          updatedAt: daysAgo(1),
        },
        {
          serviceDate: wednesday,
          serviceTime: "19:30",
          title: "Culto de Doutrina",
          theme: "A palavra que permanece",
          leaderId: paulo,
          leaderName: "Pb. Paulo César Mendes",
          preacherId: wellington,
          preacherName: "Pr. Wellington Felicio Vieira",
          createdAt: daysAgo(6),
          updatedAt: daysAgo(1),
        },
        {
          serviceDate: friday,
          serviceTime: "19:30",
          title: "Culto de Jovens",
          theme: "Fé que caminha",
          leaderId: andre,
          leaderName: "Ev. André Luiz Campos",
          preacherName: "Ev. Marcelo Dias",
          notes: "Pregador convidado, sem foto no cadastro.",
          createdAt: daysAgo(3),
          updatedAt: daysAgo(1),
        },
        {
          serviceDate: santaCeia,
          serviceTime: "18:30",
          title: "Santa Ceia",
          theme: "Em memória de Cristo",
          leaderId: wellington,
          leaderName: "Pr. Wellington Felicio Vieira",
          preacherId: paulo,
          preacherName: "Pb. Paulo César Mendes",
          createdAt: daysAgo(2),
          updatedAt: daysAgo(1),
        },
        {
          serviceDate: past,
          serviceTime: "18:30",
          title: "Culto de Celebração",
          theme: "Graça sobre graça",
          leaderId: paulo,
          leaderName: "Pb. Paulo César Mendes",
          preacherId: wellington,
          preacherName: "Pr. Wellington Felicio Vieira",
          createdAt: daysAgo(12),
          updatedAt: daysAgo(8),
        },
      ])
      .returning({ id: services.id, serviceDate: services.serviceDate, title: services.title });

    const serviceId = (date: string, title: string) => {
      const found = insertedServices.find((item) => item.serviceDate === date && item.title === title);
      if (!found) throw new Error("Culto de demonstração ausente.");
      return found.id;
    };
    await tx.insert(serviceParticipants).values([
      { serviceId: serviceId(sunday, "Culto de Celebração"), role: "singer", memberId: beatriz, name: "Beatriz Nogueira", sortOrder: 0 },
      { serviceId: serviceId(sunday, "Culto de Celebração"), role: "singer", memberId: lucas, name: "Lucas Henrique Dias", sortOrder: 1 },
      { serviceId: serviceId(sunday, "Culto de Celebração"), role: "intercessor", memberId: rosa, name: "Rosa Maria Alves", sortOrder: 0 },
      { serviceId: serviceId(sunday, "Culto de Celebração"), role: "intercessor", memberId: helena, name: "Helena Souza", sortOrder: 1 },
      { serviceId: serviceId(wednesday, "Culto de Doutrina"), role: "singer", memberId: beatriz, name: "Beatriz Nogueira", sortOrder: 0 },
      { serviceId: serviceId(wednesday, "Culto de Doutrina"), role: "intercessor", memberId: rosa, name: "Rosa Maria Alves", sortOrder: 0 },
      { serviceId: serviceId(wednesday, "Culto de Doutrina"), role: "intercessor", memberId: marcia, name: "Márcia Helena Vieira", sortOrder: 1 },
      { serviceId: serviceId(friday, "Culto de Jovens"), role: "singer", memberId: beatriz, name: "Beatriz Nogueira", sortOrder: 0 },
      { serviceId: serviceId(friday, "Culto de Jovens"), role: "singer", memberId: helena, name: "Helena Souza", sortOrder: 1 },
      { serviceId: serviceId(friday, "Culto de Jovens"), role: "intercessor", memberId: rosa, name: "Rosa Maria Alves", sortOrder: 0 },
      { serviceId: serviceId(santaCeia, "Santa Ceia"), role: "singer", memberId: beatriz, name: "Beatriz Nogueira", sortOrder: 0 },
      { serviceId: serviceId(santaCeia, "Santa Ceia"), role: "singer", memberId: lucas, name: "Lucas Henrique Dias", sortOrder: 1 },
      { serviceId: serviceId(santaCeia, "Santa Ceia"), role: "singer", memberId: helena, name: "Helena Souza", sortOrder: 2 },
      { serviceId: serviceId(santaCeia, "Santa Ceia"), role: "intercessor", memberId: rosa, name: "Rosa Maria Alves", sortOrder: 0 },
      { serviceId: serviceId(santaCeia, "Santa Ceia"), role: "intercessor", memberId: marcia, name: "Márcia Helena Vieira", sortOrder: 1 },
      { serviceId: serviceId(past, "Culto de Celebração"), role: "singer", memberId: beatriz, name: "Beatriz Nogueira", sortOrder: 0 },
      { serviceId: serviceId(past, "Culto de Celebração"), role: "intercessor", memberId: rosa, name: "Rosa Maria Alves", sortOrder: 0 },
    ]);

    await tx.insert(memberHistory).values([
      { memberId: wellington, changeType: "criacao", summary: "Cadastro criado.", previousData: null, newData: { fullName: "Wellington Felicio Vieira", status: "Ativo", phone: "(62) 99911-2030" }, actor: "Secretaria", changedAt: daysAgo(140) },
      { memberId: wellington, changeType: "cargo_eclesiastico", summary: "Cargos eclesiásticos registrados: Pastor Presidente.", previousData: null, newData: [{ title: "Pastor Presidente", consecrationDate: "1998-08-16" }], actor: "Secretaria", changedAt: daysAgo(140) },
      { memberId: wellington, changeType: "atualizacao", summary: "Dados cadastrais atualizados: telefone.", previousData: { phone: "(62) 99911-2030" }, newData: { phone: "(62) 99154-2563" }, actor: "Márcia Helena Vieira", changedAt: daysAgo(12) },
      { memberId: wellington, changeType: "parentesco", summary: "Parentesco registrado: Cônjuge de Márcia Helena Vieira.", previousData: null, newData: { tipo: "Cônjuge", pessoa: "Márcia Helena Vieira" }, actor: "Secretaria", changedAt: daysAgo(100) },
      { memberId: beatriz, changeType: "criacao", summary: "Cadastro criado.", previousData: null, newData: { fullName: "Beatriz Nogueira", status: "Ativo" }, actor: "Secretaria", changedAt: daysAgo(80) },
      { memberId: beatriz, changeType: "foto", summary: "Foto atualizada.", previousData: { foto: null }, newData: { foto: "/portraits/beatriz.jpg" }, actor: "Beatriz Nogueira", changedAt: daysAgo(5) },
      { memberId: beatriz, changeType: "cargo_local", summary: "Cargos locais registrados: Regente de louvor.", previousData: null, newData: [{ title: "Regente de louvor", startDate: "2023-03-01" }], actor: "Secretaria", changedAt: daysAgo(70) },
      { memberId: paulo, changeType: "criacao", summary: "Cadastro criado.", previousData: null, newData: { fullName: "Paulo César Mendes", status: "Ativo" }, actor: "Secretaria", changedAt: daysAgo(110) },
      { memberId: paulo, changeType: "cargo_local", summary: "Alterado: Tesoureiro (início 01/01/2019, em exercício). Removido: Secretário em exercício.", previousData: [{ title: "Secretário", startDate: "2014-02-01", endDate: null }], newData: [{ title: "Secretário", startDate: "2014-02-01", endDate: "2018-12-31" }, { title: "Tesoureiro", startDate: "2019-01-07", endDate: null }], actor: "Pr. Wellington Felicio Vieira", changedAt: daysAgo(30) },
      { memberId: helena, changeType: "criacao", summary: "Cadastro criado.", previousData: null, newData: { fullName: "Helena Souza", status: "Ativo" }, actor: "Rosa Maria Alves", changedAt: daysAgo(40) },
      { memberId: helena, changeType: "parentesco", summary: "Parentesco registrado: Filho(a) de Rosa Maria Alves.", previousData: { tipo: null, pessoa: null }, newData: { tipo: "Filho(a)", pessoa: "Rosa Maria Alves" }, actor: "Rosa Maria Alves", changedAt: daysAgo(20) },
      { memberId: andre, changeType: "criacao", summary: "Cadastro criado.", previousData: null, newData: { fullName: "André Luiz Campos", status: "Ativo" }, actor: "Secretaria", changedAt: daysAgo(90) },
      { memberId: andre, changeType: "cargo_eclesiastico", summary: "Cargos eclesiásticos registrados: Evangelista.", previousData: null, newData: [{ title: "Evangelista", consecrationDate: "2015-06-21" }], actor: "Secretaria", changedAt: daysAgo(90) },
      { memberId: joana, changeType: "criacao", summary: "Cadastro criado.", previousData: null, newData: { fullName: "Joana Ribeiro", status: "Congregado" }, actor: "Beatriz Nogueira", changedAt: daysAgo(25) },
      { memberId: joana, changeType: "status", summary: "Status definido como Congregado no primeiro cadastro.", previousData: null, newData: { status: "Congregado" }, actor: "Beatriz Nogueira", changedAt: daysAgo(25) },
    ]);

    await tx.update(churchProfile).set({ demoSeeded: true }).where(eq(churchProfile.id, 1));
  });
}
