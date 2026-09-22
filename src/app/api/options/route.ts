import { CHANGE_TYPES, GENDERS, KINSHIP_TYPES, MARITAL_STATUSES, SERVICE_TITLES, STATUSES } from "@/lib/constants";
import { saoPauloToday } from "@/lib/format";
import { bootstrap } from "@/server/bootstrap";
import { dbErrorMessage, fail, ok } from "@/server/http";
import { listKnownTitles, listMemberOptions } from "@/server/members";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await bootstrap();
    const [members, titles] = await Promise.all([listMemberOptions(), listKnownTitles()]);
    return ok({
      members,
      ...titles,
      kinshipTypes: KINSHIP_TYPES,
      statuses: STATUSES,
      genders: GENDERS,
      maritalStatuses: MARITAL_STATUSES,
      serviceTitles: SERVICE_TITLES,
      changeTypes: CHANGE_TYPES,
      today: saoPauloToday(),
    });
  } catch (error) {
    console.error(error);
    return fail(dbErrorMessage(error), 500);
  }
}
