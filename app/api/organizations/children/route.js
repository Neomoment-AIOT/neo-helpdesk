// app/api/organizations/children/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { requireAuth, allowedOrgIdsFor } from "@/app/lib/auth";

export async function GET(req) {
  try {
    const { session, error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    const { searchParams } = new URL(req.url);
    const parent_id = Number(searchParams.get("parent_id") || session.orgId);

    const allowed = await allowedOrgIdsFor(session);
    if (!allowed.includes(parent_id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parent = await prisma.organization.findUnique({
      where: { id: parent_id },
      select: { id: true, name: true, org_type: true },        // 👈 include org_type
    });

    const children = await prisma.organization.findMany({
      where: { parent_id },
      select: { id: true, name: true, org_type: true },         // 👈 include org_type
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ parent, children });
  } catch (e) {
    console.error("organizations/children error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
