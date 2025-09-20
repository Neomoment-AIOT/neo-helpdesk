// app/api/tickets/create/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";                  // ✅ use the shared client
import { requireAuth, allowedOrgIdsFor } from "@/app/lib/auth";

export async function POST(req) {
  try {
    const { user, session, error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    const { client_name, description, organization_id } = await req.json();
    if (!client_name?.trim() || !description?.trim() || !organization_id) {
      return NextResponse.json({ error: "client_name, description, organization_id required" }, { status: 400 });
    }

    const allowed = await allowedOrgIdsFor(session);
    if (!allowed.includes(Number(organization_id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const t = await prisma.tickets.create({
      data: {
        client_name: client_name.trim(),
        description: description.trim(),
        organization_id: Number(organization_id),
        ticket_type: "EXTERNAL",                // enum value as string is fine
        created_by_user_id: user.id,
      },
      include: { organizations: true },
    });

    return NextResponse.json({ ticket_id: t.ticket_id, ticket: t });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}
