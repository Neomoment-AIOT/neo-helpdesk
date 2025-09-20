// app/api/public/login/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { signToken } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db"; // shared Prisma client

export async function POST(req) {
  try {
    const { email, password, orgId } = await req.json();
    if (!email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }

    const emailLower = email.trim().toLowerCase();

    // Match your Prisma schema relations exactly:
    // users -> org_users[]; org_users includes organizations and org_custom_roles
    const user = await prisma.users.findUnique({
      where: { email: emailLower },
      include: {
        org_users: {
          include: {
            organizations: true,
            org_custom_roles: true,
          },
        },
      },
    });

    if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    // Choose org context
    let chosen = null;
    if (orgId) {
      chosen = user.org_users.find((m) => String(m.org_id) === String(orgId));
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
      role: chosen.role, // MANAGER / DEVELOPER / TESTER / VIEWER
      customRoleId: chosen.custom_role_id || null,
    });

    return NextResponse.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
      org: {
        id: chosen.organizations?.id ?? chosen.org_id,
        name: chosen.organizations?.name ?? "",
      },
      role: chosen.role,
      customRole: chosen.org_custom_roles
        ? { id: chosen.org_custom_roles.id, name: chosen.org_custom_roles.name }
        : null,
      memberships: user.org_users.map((m) => ({
        orgId: m.org_id,
        orgName: m.organizations?.name ?? "",
        role: m.role,
        customRoleId: m.custom_role_id || null,
        customRoleName: m.org_custom_roles?.name || null,
      })),
    });
  } catch (e) {
    console.error("login error:", e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
