export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { getOrgSubtreeIds } from "@/lib/access";

export async function GET(req) {
  const { user } = await getAuth();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const idsParam = url.searchParams.get("ids");
  if (!idsParam) return NextResponse.json({ summary: [] });
  const ids = idsParam.split(",").map(s => Number(s)).filter(Boolean);

  const tickets = await prisma.ticket.findMany({
    where: { id: { in: ids } },
    select: { id: true, organization_id: true },
  });

  let allowed;
  if (user.role === "MANAGER") {
    const subtree = await getOrgSubtreeIds(user.organization_id);
    allowed = new Set(subtree);
  } else {
    allowed = new Set([user.organization_id]);
  }

  const allowedTicketIds = tickets.filter(t => allowed.has(t.organization_id)).map(t => t.id);
  if (!allowedTicketIds.length) return NextResponse.json({ summary: [] });

  const rows = await prisma.ticketTimeLog.groupBy({
    by: ["ticket_id"],
    where: { ticket_id: { in: allowedTicketIds } },
    _sum: { duration_seconds: true },
  });

  return NextResponse.json({
    summary: rows.map(r => ({ ticketId: r.ticket_id, total_seconds: r._sum.duration_seconds || 0 })),
  });
}
