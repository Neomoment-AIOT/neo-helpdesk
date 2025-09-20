// app/api/users/assign/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { requireAuth, allowedOrgIdsFor } from "@/app/lib/auth";
import { sendRoleChangeEmail } from "@/app/utils/clientemail.js";

const ROLES = new Set(["MANAGER", "DEVELOPER", "TESTER", "VIEWER"]);

export async function POST(req) {
  try {
    const { session, error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });
    if (session.role !== "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { userId, toOrgId, role, customRoleId } = await req.json();
    if (!userId || !toOrgId) return NextResponse.json({ error: "userId and toOrgId required" }, { status: 400 });

    const allowed = await allowedOrgIdsFor(session);
    if (!allowed.includes(Number(toOrgId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const org = await prisma.organization.findUnique({ where: { id: Number(toOrgId) } });
    if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

    let useRole = (role || "VIEWER").toUpperCase();
    if (!ROLES.has(useRole)) useRole = "VIEWER";

    let customId = null;
    if (customRoleId) {
      const cr = await prisma.org_custom_roles.findUnique({ where: { id: Number(customRoleId) } });
      if (!cr || cr.org_id !== Number(toOrgId)) return NextResponse.json({ error: "Invalid customRoleId for this org" }, { status: 400 });
      customId = cr.id;
    }

    const membership = await prisma.org_users.upsert({
      where: { user_id_org_id: { user_id: Number(userId), org_id: Number(toOrgId) } },
      update: { role: useRole, custom_role_id: customId },
      create: { user_id: Number(userId), org_id: Number(toOrgId), role: useRole, custom_role_id: customId },
      include: {
        users: { select: { id: true, name: true, email: true } },
        organizations: { select: { id: true, name: true } },
        org_custom_roles: { select: { id: true, name: true } },   // 👈 correct relation
      },
    });

    const roleLabel = membership.org_custom_roles ? membership.org_custom_roles.name : membership.role;

    sendRoleChangeEmail({
      to: membership.users.email,
      orgName: membership.organizations.name,
      roleLabel,
    }).catch(() => {});

    return NextResponse.json({
      user: {
        userId: membership.user_id,
        name: membership.users.name,
        email: membership.users.email,
        orgId: membership.org_id,
        orgName: membership.organizations.name,
        role: membership.role,
        roleType: membership.custom_role_id ? "custom" : "builtin",
        customRoleId: membership.custom_role_id || null,
        roleLabel,
      },
    });
  } catch (e) {
    console.error("users/assign error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
