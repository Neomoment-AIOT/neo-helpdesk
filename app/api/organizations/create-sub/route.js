// app/api/organizations/create-sub/route.js
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

    const { parent_id, name, email } = await req.json();
    if (!parent_id || !String(name || "").trim()) {
      return NextResponse.json({ error: "parent_id & name required" }, { status: 400 });
    }

    const allowed = await allowedOrgIdsFor(session);
    if (!allowed.includes(Number(parent_id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const created = await prisma.organization.create({
      data: {
        name: String(name).trim(),
        parent_id: Number(parent_id),
        email: email || null,
      },
      select: { id: true, name: true, parent_id: true, email: true },
    });

    return NextResponse.json({ org: created });
  } catch (e) {
    console.error("organizations/create-sub error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
