// app/api/organizations/create-sub/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/db";
import { requireAuth, allowedOrgIdsFor } from "@/app/lib/auth";


export async function POST(req) {
  try {
    const { user, session, error, status } = await requireAuth(req);
    if (error) return NextResponse.json({ error }, { status });
    if (session.role !== "MANAGER") {
      return NextResponse.json({ error: "Only managers can create sub-organizations" }, { status: 403 });
    }

    const body = await req.json();
    const {
      parent_id,
      name,
      email,
      whatsapp,
      slack_id,
      discord_id,
      linkedin_url,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      latitude,
      longitude,
    } = body || {};

    if (!parent_id || !name?.trim()) {
      return NextResponse.json({ error: "parent_id and name are required" }, { status: 400 });
    }

    const allowed = await allowedOrgIdsFor(session);
    if (!allowed.includes(Number(parent_id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const child = await prisma.organization.create({
      data: {
        parent_id: Number(parent_id),
        name: name.trim(),
        email: email || null,
        whatsapp: whatsapp || null,
        slack_id: slack_id || null,
        discord_id: discord_id || null,
        linkedin_url: linkedin_url || null,
        address_line1: address_line1 || null,
        address_line2: address_line2 || null,
        city: city || null,
        state: state || null,
        postal_code: postal_code || null,
        country: country || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
      },
    });

    return NextResponse.json({ organization: child });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
