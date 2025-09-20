// app/api/public/signup/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/db";       // ✅ prisma from db.js
import { signToken } from "@/app/lib/auth";  // ✅ signToken from auth.js
import { sendCredentialsEmail } from "@/app/utils/clientemail.js"; // adjust path if yours differs

export async function POST(req) {
  try {
    const body = await req.json();
    const { organizationName, name, email, password, ...optional } = body;

    if (!organizationName?.trim() || !name?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normEmail = email.trim().toLowerCase();

    // block duplicate emails
    const existing = await prisma.users.findUnique({ where: { email: normEmail } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // 1) create parent org
    const org = await prisma.organization.create({
      data: {
        name: organizationName.trim(),
        customer_password: await bcrypt.hash(password, 10), // optional: you have this column
        ...mapOptionalOrg(optional),
      },
    });

    // 2) create app user (table: users)
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.users.create({
      data: {
        name: name.trim(),
        email: normEmail,
        password_hash: hashed,
      },
      select: { id: true, name: true, email: true },
    });

    // 3) membership in this org as MANAGER (table: org_users)
    await prisma.org_users.create({
      data: {
        user_id: user.id,
        org_id: org.id,
        role: "MANAGER",
      },
    });

    // 4) email credentials
    await sendCredentialsEmail({
      to: normEmail,
      orgName: org.name,
      email: normEmail,
      password, // raw password per your requirement
      portalUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    }).catch((err) => {
      console.error("sendCredentialsEmail failed:", err);
      // don’t fail signup if email provider is down
    });

    // 5) issue JWT for immediate login
    const token = await signToken({
      userId: user.id,
      email: user.email,
      orgId: org.id,
      role: "MANAGER",
    });

    return NextResponse.json({
      token,
      role: "MANAGER",
      org: { id: org.id, name: org.name },
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
