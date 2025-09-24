// app/api/users/update-role/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { requireAuth, allowedOrgIdsFor } from "@/app/lib/auth";
// adjust util path if needed:
import { sendRoleChangeEmail } from "app/utils/clientemail.js";

const ROLES = new Set(["MANAGER", "DEVELOPER", "TESTER", "VIEWER"]);

export async function POST(req) {
  try {
    const { session, error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });
    if ((session.role || "").toUpperCase() !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, orgId, role, customRoleId } = await req.json();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "userId and orgId required" }, { status: 400 });
    }

    const allowed = await allowedOrgIdsFor(session);
    if (!allowed.includes(Number(orgId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let updateData = {};
    if (customRoleId) {
      const cr = await prisma.org_custom_roles.findUnique({ where: { id: Number(customRoleId) } });
      if (!cr || cr.org_id !== Number(orgId)) {
        return NextResponse.json({ error: "Invalid customRoleId for this org" }, { status: 400 });
      }
      updateData = { role: "VIEWER", custom_role_id: cr.id }; // role still stored; label comes from custom
    } else {
      const useRole = (role || "VIEWER").toUpperCase();
      if (!ROLES.has(useRole)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      updateData = { role: useRole, custom_role_id: null };
    }

    const membership = await prisma.org_users.update({
      where: { user_id_org_id: { user_id: Number(userId), org_id: Number(orgId) } },
      data: updateData,
      include: {
        users: { select: { id: true, name: true, email: true } },
        organizations: { select: { id: true, name: true } },
        org_custom_roles: { select: { id: true, name: true } },
      },
    });

    try {
      await sendRoleChangeEmail({
        to: membership.users.email,
        orgName: membership.organizations.name,
        roleLabel: membership.org_custom_roles ? membership.org_custom_roles.name : membership.role,
      });
    } catch (e) {
      console.warn("sendRoleChangeEmail failed:", e?.message || e);
    }

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
        roleLabel: membership.org_custom_roles ? membership.org_custom_roles.name : membership.role,
      },
    });
  } catch (e) {
    console.error("users/update-role error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
