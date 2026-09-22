import { ensureSeed } from "@/lib/seed";
import { getMemberFacets, listMembers } from "@/lib/repo";
import { createMember } from "@/lib/member-writes";
import { validateMember } from "@/lib/validation";
import type { MemberFilters } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await ensureSeed();
    const params = new URL(request.url).searchParams;

    const filters: MemberFilters = {
      q: params.get("q") ?? undefined,
      ecclesiastical: params.get("ecclesiastical") ?? undefined,
      local: params.get("local") ?? undefined,
      kinship: params.get("kinship") ?? undefined,
      status: params.get("status") ?? undefined,
      sort: (params.get("sort") as MemberFilters["sort"]) ?? "name",
    };

    const [data, facets] = await Promise.all([listMembers(filters), getMemberFacets()]);

    return Response.json({ ok: true, data, total: data.length, facets });
  } catch (error) {
    console.error("[api/members GET]", error);
    return Response.json(
      { ok: false, error: "Não foi possível carregar os membros." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const result = validateMember(body);

    if (!result.ok) {
      return Response.json({ ok: false, errors: result.errors }, { status: 400 });
    }

    const member = await createMember(result.data);
    return Response.json({ ok: true, data: member }, { status: 201 });
  } catch (error) {
    console.error("[api/members POST]", error);
    return Response.json(
      { ok: false, error: "Falha ao salvar o cadastro. Tente novamente." },
      { status: 500 },
    );
  }
}
