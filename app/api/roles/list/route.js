// app/api/roles/list/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { requireAuth, allowedOrgIdsFor } from "@/app/lib/auth";

const BUILTIN = ["MANAGER", "DEVELOPER", "TESTER", "VIEWER"];

export async function GET(req) {
  try {
    const { session, error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    const { searchParams } = new URL(req.url);
    const orgId = Number(searchParams.get("orgId") || session.orgId);

    const allowed = await allowedOrgIdsFor(session);
    if (!allowed.includes(orgId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const custom = await prisma.org_custom_roles.findMany({
      where: { org_id: orgId },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        can_view_tickets: true,
        can_send_tickets: true,
        can_create_users: true,
        can_create_orgs: true,
      },
    });

    return NextResponse.json({ builtin: BUILTIN, custom });
  } catch (e) {
    console.error("roles/list error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
