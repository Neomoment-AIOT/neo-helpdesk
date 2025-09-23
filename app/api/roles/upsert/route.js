// app/api/roles/upsert/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { requireAuth, getOrgDescendantIds } from "@/app/lib/auth";

export async function POST(req) {
  const { session, error, status } = await requireAuth(req);
  if (error) return NextResponse.json({ error }, { status });

  const body = await req.json();
  const {
    id, orgId, name,
    can_view_tickets,
    can_send_tickets,
    can_create_users,
    can_create_orgs,
    can_create_roles,    // ✅ NEW
  } = body;

  if (!orgId || !name?.trim()) {
    return NextResponse.json({ error: "Missing orgId or name" }, { status: 400 });
  }

  const data = {
    org_id: Number(orgId),
    name: name.trim(),
    can_view_tickets: !!can_view_tickets,
    can_send_tickets: !!can_send_tickets,
    can_create_users: !!can_create_users,
    can_create_orgs: !!can_create_orgs,
    can_create_roles: !!can_create_roles, // ✅ NEW
  };

  const role = id
    ? await prisma.org_custom_roles.update({ where: { id: Number(id) }, data })
    : await prisma.org_custom_roles.create({ data });

  return NextResponse.json({ role });
}
