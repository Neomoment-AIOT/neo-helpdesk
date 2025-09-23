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

    const rows = await prisma.org_custom_roles.findMany({
      where: { org_id: Number(orgId) },
      select: {
        id: true,
        name: true,
        can_view_tickets: true,
        can_send_tickets: true,
        can_create_users: true,
        can_create_orgs: true,
        can_create_roles: true,   // ✅ NEW
      },
      orderBy: [{ name: "asc" }],
    });
    return NextResponse.json({
      custom: rows.map(r => ({
        ...r,
        can_view_tickets: !!r.can_view_tickets,
        can_send_tickets: !!r.can_send_tickets,
        can_create_users: !!r.can_create_users,
        can_create_orgs: !!r.can_create_orgs,
        can_create_roles: !!r.can_create_roles,
      })),
    });
  } catch (e) {
    console.error("roles/list error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
