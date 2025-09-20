// app/api/roles/upsert/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { requireAuth, getOrgDescendantIds } from "@/app/lib/auth";

export async function POST(req) {
  try {
    const { session, error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    // Only built-in MANAGER may create/update role definitions
    const isManager = (session.role || "").toUpperCase() === "MANAGER";
    if (!isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const {
      id,
      orgId,
      name,
      can_view_tickets,
      can_send_tickets,
      can_create_users,
      can_create_orgs,
    } = body || {};

    if (!orgId || !String(name || "").trim()) {
      return NextResponse.json({ error: "orgId & name required" }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: Number(orgId) },
      select: { id: true },
    });
    if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

    const allowed = await getOrgDescendantIds(session.orgId);
    if (!allowed.includes(Number(orgId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data = {
      org_id: Number(orgId),
      name: String(name).trim(),
      can_view_tickets: !!can_view_tickets,
      can_send_tickets: !!can_send_tickets,
      can_create_users: !!can_create_users,
      can_create_orgs: !!can_create_orgs,
      updated_at: new Date(),
    };

    const role = id
      ? await prisma.org_custom_roles.update({
          where: { id: Number(id) },
          data,
          select: {
            id: true,
            name: true,
            can_view_tickets: true,
            can_send_tickets: true,
            can_create_users: true,
            can_create_orgs: true,
          },
        })
      : await prisma.org_custom_roles.create({
          data: { ...data, created_at: new Date() },
          select: {
            id: true,
            name: true,
            can_view_tickets: true,
            can_send_tickets: true,
            can_create_users: true,
            can_create_orgs: true,
          },
        });

    return NextResponse.json({ role });
  } catch (e) {
    console.error("roles/upsert error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
