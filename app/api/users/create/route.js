// app/api/users/create/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/db";
import { requireAuth, allowedOrgIdsFor } from "@/app/lib/auth";
import { sendCredentialsEmail } from "@/app/utils/clientemail";

const BUILTIN = new Set(["MANAGER", "DEVELOPER", "TESTER", "VIEWER"]);

function randomPassword(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function canCreateUsers(session, orgId) {
  if ((session.role || "").toUpperCase() === "MANAGER") return true;

  // Look up membership on the target org and see if a custom role grants creation
  const mem = await prisma.org_users.findUnique({
    where: { user_id_org_id: { user_id: Number(session.userId), org_id: Number(orgId) } },
    include: { org_custom_roles: true },
  });
  if (!mem) return false;
  if (mem.org_custom_roles?.can_create_users) return true;

  return false; // built-ins other than MANAGER get no create permission by default
}

export async function POST(req) {
  try {
    const { session, error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    const { name, email, orgId, role } = await req.json();
    if (!name?.trim() || !email?.trim() || !orgId) {
      return NextResponse.json({ error: "name, email, orgId required" }, { status: 400 });
    }

    const allowed = await allowedOrgIdsFor(session);
    if (!allowed.includes(Number(orgId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!(await canCreateUsers(session, orgId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const normEmail = email.trim().toLowerCase();
    let user = await prisma.users.findUnique({ where: { email: normEmail } });

    let passwordPlain = randomPassword(12);
    const password_hash = await bcrypt.hash(passwordPlain, 10);

    if (!user) {
      user = await prisma.users.create({
        data: {
          name: name.trim(),
          email: normEmail,
          password_hash,
        },
        select: { id: true, name: true, email: true },
      });
    }

    let useRole = (role || "VIEWER").toUpperCase();
    if (!BUILTIN.has(useRole)) useRole = "VIEWER";

    const membership = await prisma.org_users.upsert({
      where: { user_id_org_id: { user_id: user.id, org_id: Number(orgId) } },
      update: { role: useRole, custom_role_id: null },
      create: { user_id: user.id, org_id: Number(orgId), role: useRole },
      include: { organizations: true },
    });

    // only send credentials if we created the user just now (no prior account)
    try {
      if (!user.passwordWasExisting) {
        await sendCredentialsEmail({
          to: user.email,
          orgName: membership.organizations.name,
          email: user.email,
          password: passwordPlain,
          portalUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        });
      }
    } catch (e) {
      console.warn("sendCredentialsEmail failed:", e?.message || e);
    }

    return NextResponse.json({
      user: {
        userId: user.id,
        name: user.name,
        email: user.email,
        orgId: membership.org_id,
        orgName: membership.organizations.name,
        role: membership.role,
        roleType: "builtin",
        customRoleId: null,
        roleLabel: membership.role,
      },
    });
  } catch (e) {
    console.error("users/create error:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
