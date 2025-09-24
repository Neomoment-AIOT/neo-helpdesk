// app/api/users/delete/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { requireAuth, allowedOrgIdsFor } from "@/app/lib/auth";

export async function POST(req) {
  try {
    const { session, error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });
    if ((session.role || "").toUpperCase() !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, orgId } = await req.json();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "userId and orgId required" }, { status: 400 });
    }

    const allowed = await allowedOrgIdsFor(session);
    if (!allowed.includes(Number(orgId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.org_users.delete({
      where: { user_id_org_id: { user_id: Number(userId), org_id: Number(orgId) } },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("users/delete error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
