import { desc, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import { getMember, getMemberHistory } from "@/lib/repo";
import { deleteMember, updateMember } from "@/lib/member-writes";
import { validateMember } from "@/lib/validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) return Response.json({ ok: false, error: "ID inválido." }, { status: 400 });

  try {
    const member = await getMember(id);
    if (!member) return Response.json({ ok: false, error: "Membro não encontrado." }, { status: 404 });

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
        .orderBy(desc(services.serviceDate))
        .limit(12),
    ]);

    return Response.json({ ok: true, data: member, history, participations });
  } catch (error) {
    console.error("[api/members/[id] GET]", error);
    return Response.json({ ok: false, error: "Falha ao carregar o cadastro." }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) return Response.json({ ok: false, error: "ID inválido." }, { status: 400 });

  try {
    const body = await request.json().catch(() => null);
    const result = validateMember(body);
    if (!result.ok) return Response.json({ ok: false, errors: result.errors }, { status: 400 });

    const updated = await updateMember(id, result.data);
    if (!updated) return Response.json({ ok: false, error: "Membro não encontrado." }, { status: 404 });

    return Response.json({ ok: true, data: updated });
  } catch (error) {
    console.error("[api/members/[id] PUT]", error);
    return Response.json({ ok: false, error: "Falha ao atualizar o cadastro." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) return Response.json({ ok: false, error: "ID inválido." }, { status: 400 });

  try {
    const result = await deleteMember(id);
    if (!result.deleted) {
      return Response.json({ ok: false, error: "Membro não encontrado." }, { status: 404 });
    }
    return Response.json({ ok: true, data: { id, name: result.name ?? "" } });
  } catch (error) {
    console.error("[api/members/[id] DELETE]", error);
    return Response.json({ ok: false, error: "Falha ao excluir o cadastro." }, { status: 500 });
  }
}


