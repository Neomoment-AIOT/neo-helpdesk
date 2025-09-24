// app/api/organizations/create-sub/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { requireAuth, allowedOrgIdsFor } from "@/app/lib/auth";

export async function POST(req) {
  try {
    const { session, error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    // (Optional) keep your own gating, or also allow custom perms
    if ((session.role || "").toUpperCase() !== "MANAGER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ✅ Read body once
    const body = await req.json();
    const { parent_id, name, email, org_type: rawType } = body || {};

    if (!parent_id || !String(name || "").trim()) {
      return NextResponse.json({ error: "parent_id & name required" }, { status: 400 });
    }

    // ✅ Normalize org_type with default to NORMAL
    const normType = String(rawType || "NORMAL").toUpperCase();
    const org_type = normType === "CLIENT" ? "CLIENT" : "NORMAL";

    // permissions: caller must be allowed to act on this parent
    const allowed = await allowedOrgIdsFor(session);
    if (!allowed.includes(Number(parent_id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // ✅ Parent must not be CLIENT
    const parent = await prisma.organization.findUnique({
      where: { id: Number(parent_id) },
      select: { id: true, org_type: true },
    });
    if (!parent) {
      return NextResponse.json({ error: "Parent org not found" }, { status: 404 });
    }
    if (parent.org_type === "CLIENT") {
      return NextResponse.json(
        { error: "Parent org is CLIENT; cannot create sub-organization." },
        { status: 403 }
      );
    }

    // ✅ Create child with enforced org_type
    const created = await prisma.organization.create({
      data: {
        parent_id: Number(parent_id),
        name: name.trim(),
        email: email || null,
        org_type,
      },
      select: {
        id: true,
        name: true,
        email: true,
        parent_id: true,
        org_type: true,
        created_at: true,
      },
    });

    return NextResponse.json({ org: created }, { status: 201 });
  } catch (e) {
    console.error("organizations/create-sub error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
