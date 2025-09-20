// app/api/users/list/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { requireAuth, allowedOrgIdsFor, getOrgDescendantIds } from "@/app/lib/auth";

export async function GET(req) {
  try {
    const { session, error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    const { searchParams } = new URL(req.url);
    const orgId = Number(searchParams.get("orgId") || session.orgId);
    const includeChildren = searchParams.get("includeChildren") === "1";

    let allowed = await allowedOrgIdsFor(session);
    if (includeChildren && session.role === "MANAGER") {
      if (!allowed.includes(orgId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      const subtree = await getOrgDescendantIds(orgId);
      allowed = allowed.filter(id => subtree.includes(id));
    } else {
      if (!allowed.includes(orgId)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      allowed = [orgId];
    }

    const rows = await prisma.org_users.findMany({
      where: { org_id: { in: allowed } },
      include: {
        users: { select: { id: true, name: true, email: true } },
        organizations: { select: { id: true, name: true } },
        org_custom_roles: { select: { id: true, name: true } },  // 👈 correct relation
      },
      orderBy: [{ org_id: "asc" }],
    });

    return NextResponse.json({
      users: rows.map(m => ({
        userId: m.user_id,
        name: m.users.name,
        email: m.users.email,
        orgId: m.org_id,
        orgName: m.organizations.name,
        role: m.role,
        roleType: m.custom_role_id ? "custom" : "builtin",
        customRoleId: m.custom_role_id || null,
        roleLabel: m.org_custom_roles ? m.org_custom_roles.name : m.role,
      })),
    });
  } catch (e) {
    console.error("users/list error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
