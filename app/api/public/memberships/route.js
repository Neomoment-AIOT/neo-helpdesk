// app/api/public/memberships/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get("email") || "").trim().toLowerCase();
    if (!email) return NextResponse.json({ memberships: [] });

    const user = await prisma.users.findUnique({
      where: { email },
      include: {
        org_users: { include: { organizations: true } },
      },
    });

    if (!user) return NextResponse.json({ memberships: [] });

    const memberships = user.org_users.map((m) => ({
      orgId: m.org_id,
      orgName: m.organizations?.name || String(m.org_id),
      role: m.role,
    }));

    return NextResponse.json({ memberships });
  } catch (e) {
    console.error("memberships lookup error:", e);
    return NextResponse.json({ memberships: [] });
  }
}
