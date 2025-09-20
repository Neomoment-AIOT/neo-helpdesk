// app/api/roles/upsert/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { requireAuth, allowedOrgIdsFor } from "@/app/lib/auth";

export async function POST(req) {
  try {
    const { session, error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    const body = await req.json();
    const {
      id,
      orgId,
      name,
      can_view_tickets,
      can_send_tickets,
      can_create_users,
      can_create_orgs,
    } = body || {};

    // 400: missing
    if (!orgId || !name?.trim()) {
      return NextResponse.json({ error: "orgId & name required" }, { status: 400 });
    }

    const numericOrgId = Number(orgId);

    // Org must be in user's allowed set
    const allowed = await allowedOrgIdsFor(session);
    if (!allowed.includes(numericOrgId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ---- Authorization: MANAGER or custom role with manage-level rights in THIS org
    let permitted = (session.role || "").toUpperCase() === "MANAGER";

    if (!permitted) {
      const membership = await prisma.org_users.findUnique({
        where: { user_id_org_id: { user_id: Number(session.userId), org_id: numericOrgId } },
        include: { org_custom_roles: true },
      });
      if (
        membership?.org_custom_roles?.can_create_users ||
        membership?.org_custom_roles?.can_create_orgs
      ) {
        permitted = true;
      }
    }

    if (!permitted) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // ---- End authorization

    const data = {
      org_id: numericOrgId,
      name: name.trim(),
      can_view_tickets: !!can_view_tickets,
      can_send_tickets: !!can_send_tickets,
      can_create_users: !!can_create_users,
      can_create_orgs: !!can_create_orgs,
      updated_at: new Date(),
    };

    let role;
    if (id) {
      role = await prisma.org_custom_roles.update({
        where: { id: Number(id) },
        data,
      });
    } else {
      role = await prisma.org_custom_roles.create({
        data: { ...data, created_at: new Date() },
      });
    }

    return NextResponse.json({
      role: {
        id: role.id,
        name: role.name,
        can_view_tickets: role.can_view_tickets,
        can_send_tickets: role.can_send_tickets,
        can_create_users: role.can_create_users,
        can_create_orgs: role.can_create_orgs,
      },
    });
  } catch (e) {
    // Handle unique constraint: uq_org_custom_roles_org_name
    if (e?.code === "P2002") {
      return NextResponse.json(
        { error: "Role name must be unique within the organization" },
        { status: 409 }
      );
    }
    console.error("roles/upsert error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
