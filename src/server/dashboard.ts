import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { localOffices, memberHistory, members } from "@/db/schema";
import { ageTurning, saoPauloHour, saoPauloToday } from "@/lib/format";
import { memberPhotoUrl } from "./http";
import { listServices } from "./services";

export async function getDashboard() {
  const today = saoPauloToday();
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthEnd = `${today.slice(0, 7)}-31`;
  const [memberRows, officeRows, historyRows, services] = await Promise.all([
    db.select({
      id: members.id,
      fullName: members.fullName,
      photo: members.photo,
      updatedAt: members.updatedAt,
      status: members.status,
      birthDate: members.birthDate,
    }).from(members),
    db.select({ id: localOffices.id, endDate: localOffices.endDate }).from(localOffices),
    db
      .select({
        id: memberHistory.id,
        memberId: memberHistory.memberId,
        memberName: members.fullName,
        changeType: memberHistory.changeType,
        summary: memberHistory.summary,
        actor: memberHistory.actor,
        changedAt: memberHistory.changedAt,
      })
      .from(memberHistory)
      .innerJoin(members, eq(memberHistory.memberId, members.id))
      .orderBy(desc(memberHistory.changedAt), desc(memberHistory.id))
      .limit(8),
    listServices(),
  ]);

  const birthdays = memberRows
    .filter((member) => member.birthDate && member.birthDate.slice(5, 7) === today.slice(5, 7) && member.status !== "falecido")
    .map((member) => ({
      id: member.id,
      fullName: member.fullName,
      photoUrl: memberPhotoUrl(member.id, member.photo, member.updatedAt),
      birthDate: member.birthDate as string,
      day: Number(member.birthDate?.slice(8, 10)),
      turning: ageTurning(member.birthDate as string, today),
      isToday: member.birthDate?.slice(5) === today.slice(5),
    }))
    .sort((a, b) => a.day - b.day || a.fullName.localeCompare(b.fullName, "pt-BR"));

  const upcoming = services.filter((service) => service.serviceDate >= today).sort((a, b) => a.serviceDate.localeCompare(b.serviceDate) || a.serviceTime.localeCompare(b.serviceTime));

  return {
    today,
    greetingHour: saoPauloHour(),
    stats: {
      activeMembers: memberRows.filter((member) => member.status === "ativo" || member.status === "congregado").length,
      totalMembers: memberRows.length,
      servicesThisMonth: services.filter((service) => service.serviceDate >= monthStart && service.serviceDate <= monthEnd).length,
      activeLocalOffices: officeRows.filter((office) => !office.endDate || office.endDate >= today).length,
      birthdays: birthdays.length,
    },
    nextService: upcoming[0] ?? null,
    upcoming: upcoming.slice(0, 4),
    birthdays,
    recentChanges: historyRows.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      memberName: row.memberName,
      changeType: row.changeType,
      summary: row.summary,
      actor: row.actor,
      changedAt: row.changedAt.toISOString(),
    })),
  };
}
