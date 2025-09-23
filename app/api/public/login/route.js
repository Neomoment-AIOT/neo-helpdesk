// app/api/public/login/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signToken } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

export async function POST(req) {
  try {
    const { email, password, orgId } = await req.json();
    if (!email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }
    const emailLower = email.trim().toLowerCase();

    const user = await prisma.users.findUnique({
      where: { email: emailLower },
      include: {
        org_users: { include: { organizations: true } },
      },
    });
    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    // if multiple memberships and no orgId -> require explicit selection
    if (!orgId && user.org_users.length > 1) {
      return NextResponse.json(
        {
          error: "Multiple organizations found. Please select one.",
          memberships: user.org_users.map((m) => ({
            orgId: m.org_id,
            orgName: m.organizations?.name || String(m.org_id),
            role: m.role,
          })),
        },
        { status: 409 }
      );
    }

    // choose active org/membership
    let chosen = null;
    if (orgId) {
      chosen = user.org_users.find((m) => String(m.org_id) === String(orgId)) || null;
      if (!chosen) {
        return NextResponse.json({ error: "No access to the requested organization" }, { status: 403 });
      }
    } else {
      chosen = user.org_users[0] || null;
      if (!chosen) return NextResponse.json({ error: "No organization membership found" }, { status: 403 });
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      orgId: chosen.org_id,
      role: chosen.role,
    });

    return NextResponse.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
      org: { id: chosen.organizations.id, name: chosen.organizations.name },
      role: chosen.role,
      memberships: user.org_users.map((m) => ({
        orgId: m.org_id,
        orgName: m.organizations.name,
        role: m.role,
      })),
    });
  } catch (e) {
    console.error("login error:", e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
