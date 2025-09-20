// app/api/tickets/list/route.js
import { NextResponse } from "next/server";
import { PrismaClient, ticket_type } from "@prisma/client";
import { requireAuth, allowedOrgIdsFor, getOrgDescendantIds } from "@/app/lib/auth";
const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const { session, error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") || 1);
    const pageSize = Math.min(1000, Number(searchParams.get("pageSize") || 50));
    const type = searchParams.get("type") || "EXTERNAL";
    const orgId = Number(searchParams.get("orgId") || session.orgId);
    const includeChildren = searchParams.get("includeChildren") === "1";

    let allowed = await allowedOrgIdsFor(session);
    if (!allowed.includes(orgId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    let orgIds = [orgId];
    if (includeChildren && session.role === "MANAGER") {
      orgIds = await getOrgDescendantIds(orgId);
      // still intersect with allowed
      orgIds = orgIds.filter(id => allowed.includes(id));
    }

    const where = {
      ticket_type: type === "EXTERNAL" ? ticket_type.EXTERNAL : ticket_type.INTERNAL,
      organization_id: { in: orgIds },
    };

    const tickets = await prisma.ticket.findMany({
      where,
      include: { organization: true, team: true, assignee: true, histories: true },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({ tickets });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
