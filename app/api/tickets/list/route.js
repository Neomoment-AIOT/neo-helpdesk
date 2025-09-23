// app/api/tickets/list/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { requireAuth, allowedOrgIdsFor, getOrgDescendantIds } from "@/app/lib/auth";

export async function GET(req) {
  try {
    const { session, error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    const { searchParams } = new URL(req.url);
    const orgId = Number(searchParams.get("orgId") || session.orgId);
    const includeChildren = searchParams.get("includeChildren") === "1";

    const allowed = await allowedOrgIdsFor(session);
    if (!allowed.includes(orgId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const sel = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { org_type: true },
    });

    let orgIds = [orgId];
    if (includeChildren && sel?.org_type !== "CLIENT") {
      const descendantIds = await getOrgDescendantIds(orgId);
      orgIds = [orgId, ...descendantIds];
    }

    const tickets = await prisma.ticket.findMany({
      where: { organization_id: { in: orgIds } },
      orderBy: [{ created_at: "desc" }],
      select: {
        id: true,
        ticket_id: true,
        client_name: true,
        description: true,
        status: true,
        created_at: true,
        updated_at: true,
        organization_id: true,
        organization: { select: { name: true } },
      },
    });

    return NextResponse.json({
      tickets: tickets.map(t => ({
        ...t,
        orgName: t.organization?.name,
      })),
    });
  } catch (e) {
    console.error("tickets/list error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
