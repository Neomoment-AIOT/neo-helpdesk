// app/api/public/signup/route.js
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { signToken } from "@/app/lib/auth";
// adjust the path if your util lives elsewhere:
import { sendCredentialsEmail } from "app/utils/clientemail.js";

export async function POST(req) {
  try {
    const body = await req.json();
    const { organizationName, name, email, password, ...optional } = body;

    if (!organizationName?.trim() || !name?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normEmail = email.trim().toLowerCase();

    const existing = await prisma.users.findUnique({ where: { email: normEmail } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const org = await prisma.organization.create({
      data: {
        name: organizationName.trim(),
        customer_password: await bcrypt.hash(password, 10),
        ...mapOptionalOrg(optional),
      },
      select: { id: true, name: true },
    });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.users.create({
      data: {
        name: name.trim(),
        email: normEmail,
        password_hash: hashed,
      },
      select: { id: true, name: true, email: true },
    });

    await prisma.org_users.create({
      data: { user_id: user.id, org_id: org.id, role: "MANAGER" },
    });

    // send credentials by email (non-blocking)
    try {
      await sendCredentialsEmail({
        to: normEmail,
        orgName: org.name,
        email: normEmail,
        password,
        portalUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      });
    } catch (e) {
      console.warn("sendCredentialsEmail failed:", e?.message || e);
    }

    const token = await signToken({
      userId: user.id,
      email: user.email,
      orgId: org.id,
      role: "MANAGER",
    });

    return NextResponse.json({
      token,
      role: "MANAGER",
      org,
      user,
    });
  } catch (e) {
    console.error("Signup error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

function mapOptionalOrg(opt = {}) {
  return {
    whatsapp: opt.whatsapp || null,
    slack_id: opt.slackId || null,
    discord_id: opt.discordId || null,
    linkedin_url: opt.linkedin || null,
    email: opt.email || null,
    address_line1: opt.address || null,
    address_line2: null,
    city: opt.city || null,
    state: opt.state || null,
    postal_code: opt.postalCode || null,
    country: opt.country || null,
    latitude: opt.latitude ? Number(opt.latitude) : null,
    longitude: opt.longitude ? Number(opt.longitude) : null,
  };
}
