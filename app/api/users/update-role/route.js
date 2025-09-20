// app/api/users/update-role/route.js
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

    const { userId, orgId, role, customRoleId } = await req.json();
    if (!userId || !orgId) return NextResponse.json({ error: "userId, orgId required" }, { status: 400 });

    const allowed = await allowedOrgIdsFor(session);
    if (!allowed.includes(Number(orgId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    let data = {};
    if (customRoleId) {
      const cr = await prisma.org_custom_roles.findUnique({ where: { id: Number(customRoleId) } });
      if (!cr || cr.org_id !== Number(orgId)) return NextResponse.json({ error: "Invalid customRoleId" }, { status: 400 });
      data = { custom_role_id: Number(customRoleId), role: "VIEWER" }; // base enum kept (not used when custom)
    } else {
      const r = (role || "VIEWER").toUpperCase();
      if (!ROLES.has(r)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      data = { role: r, custom_role_id: null };
    }

    const membership = await prisma.org_users.update({
      where: { user_id_org_id: { user_id: Number(userId), org_id: Number(orgId) } },
      data,
      include: {
        users: { select: { id: true, name: true, email: true } },
        organizations: { select: { id: true, name: true } },
        org_custom_roles: { select: { id: true, name: true } },
      },
    });

    const roleLabel = membership.org_custom_roles ? membership.org_custom_roles.name : membership.role;

    // fire & forget email
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
    console.error("users/update-role error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
