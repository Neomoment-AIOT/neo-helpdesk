// app/api/users/create/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/db";
import { requireAuth, allowedOrgIdsFor } from "@/app/lib/auth";
import { sendCredentialsEmail } from "@/app/utils/clientemail";

const ROLES = new Set(["MANAGER", "DEVELOPER", "TESTER", "VIEWER"]);
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function randPassword() {
  // ~12 chars
  return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);
}

export async function POST(req) {
  try {
    const { session, error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });

    // only managers may create users
    if (session.role !== "MANAGER") {
      return NextResponse.json({ error: "Only managers can create users" }, { status: 403 });
    }

    const { name, email, password, orgId, role } = await req.json();

    if (!name?.trim() || !email?.trim() || !orgId) {
      return NextResponse.json({ error: "name, email, orgId required" }, { status: 400 });
    }
    const roleIn = (role || "VIEWER").toUpperCase();
    if (!ROLES.has(roleIn)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // org scope enforcement
    const allowed = await allowedOrgIdsFor(session);
    if (!allowed.includes(Number(orgId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const emailLower = email.trim().toLowerCase();

    let plainPasswordToEmail = null;
    let createdUser = null;

    await prisma.$transaction(async (tx) => {
      const existing = await tx.users.findUnique({ where: { email: emailLower } });

      if (!existing) {
        // new user: use provided password or generate one
        const pwd = password?.trim() || randPassword();
        const hash = await bcrypt.hash(pwd, 10);

        createdUser = await tx.users.create({
          data: { name: name.trim(), email: emailLower, password_hash: hash },
          select: { id: true, name: true, email: true },
        });

        plainPasswordToEmail = pwd; // email creds for new users

      } else {
        // existing user: optionally reset password if manager supplied one
        createdUser = existing;
        if (password?.trim()) {
          const hash = await bcrypt.hash(password.trim(), 10);
          await tx.users.update({
            where: { id: existing.id },
            data: { password_hash: hash },
          });
          plainPasswordToEmail = password.trim(); // email only if we just set it
        }
      }

      // upsert org membership
      await tx.org_users.upsert({
        where: { user_id_org_id: { user_id: createdUser.id, org_id: Number(orgId) } },
        update: { role: roleIn },
        create: { user_id: createdUser.id, org_id: Number(orgId), role: roleIn },
      });
    });

    // send credentials iff new user OR password explicitly set
    if (plainPasswordToEmail) {
      const org = await prisma.organization.findUnique({
        where: { id: Number(orgId) },
        select: { name: true },
      });

      try {
        await sendCredentialsEmail({
          to: emailLower,
          orgName: org?.name || "",
          email: emailLower,
          password: plainPasswordToEmail,
          portalUrl: appUrl,
        });
      } catch (err) {
        console.error("sendCredentialsEmail failed:", err);
      }
    }

    return NextResponse.json({
      user: { id: createdUser.id, name: createdUser.name, email: createdUser.email },
      orgId: Number(orgId),
      role: roleIn,
      emailedCredentials: Boolean(plainPasswordToEmail),
    });
  } catch (e) {
    console.error("users/create error:", e);
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }
}
