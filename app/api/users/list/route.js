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

    const allowed = await allowedOrgIdsFor(session);
    if (!allowed.includes(orgId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch selected org type
    const sel = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { org_type: true },
    });

    // Build the set of org IDs to query
    let orgIds = [orgId];
    if (includeChildren && sel?.org_type !== "CLIENT") {
      const descendantIds = await getOrgDescendantIds(orgId); // array<number>
      orgIds = [orgId, ...descendantIds];
    }

    const rows = await prisma.org_users.findMany({
      where: { org_id: { in: orgIds } },
      include: {
        users: true,
        organizations: { select: { name: true } },
      },
      orderBy: [{ org_id: "asc" }, { user_id: "asc" }],
    });

    const users = rows.map(r => ({
      userId: r.user_id,
      email: r.users.email,
      name: r.users.name,
      orgId: r.org_id,
      orgName: r.organizations?.name,
      role: r.role,
      roleType: r.custom_role_id ? "CUSTOM" : "BUILTIN",
      customRoleId: r.custom_role_id ?? null,
      roleLabel: r.custom_role_id ? undefined : r.role,
    }));

    return NextResponse.json({ users });
  } catch (e) {
    console.error("users/list error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
