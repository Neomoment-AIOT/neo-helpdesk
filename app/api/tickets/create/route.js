// app/api/tickets/create/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { requireAuth, allowedOrgIdsFor } from "@/app/lib/auth";

// checks whether the session can create (send) tickets for the given org
async function canSendTickets(session, orgId) {
  if ((session.role || "").toUpperCase() === "MANAGER") return true;

  const membership = await prisma.org_users.findUnique({
    where: { user_id_org_id: { user_id: Number(session.userId), org_id: Number(orgId) } },
    include: { org_custom_roles: true },
  });

  if (!membership) return false;

  // custom role flag
  if (membership.org_custom_roles?.can_send_tickets) return true;

  // non-manager built-in roles default to no create permission
  return false;
}

export async function POST(req) {
  try {
    const { session, error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    const { client_name, description, organization_id } = await req.json();

    if (!client_name?.trim() || !description?.trim() || !organization_id) {
      return NextResponse.json({ error: "client_name, description, organization_id required" }, { status: 400 });
    }

    const orgId = Number(organization_id);
    const allowed = await allowedOrgIdsFor(session);
    if (!allowed.includes(orgId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!(await canSendTickets(session, orgId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const created = await prisma.ticket.create({
      data: {
        client_name: client_name.trim(),
        description: description.trim(),
        organization_id: orgId,
        created_by_user_id: Number(session.userId),
        status: "NOT_STARTED",
        created_at: new Date(),
        updated_at: new Date(),
      },
      select: { id: true, ticket_id: true, client_name: true },
    });

    return NextResponse.json(created);
  } catch (e) {
    console.error("tickets/create error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
