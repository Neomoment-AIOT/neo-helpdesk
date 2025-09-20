// app/api/public/signup/route.js
import prisma from "../../../lib/prisma";

// Helper to make a simple slug from the org name
function toSlug(str = "") {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function POST(req) {
  try {
    const { organizationName, password, name } = await req.json();

    // Minimal validation (no email anymore)
    if (!organizationName?.trim() || !password?.trim()) {
      return new Response(
        JSON.stringify({ error: "Organization name and password are required" }),
        { status: 400 }
      );
    }

    const orgName = organizationName.trim();

    // If you want "unique org name" semantics, block duplicates:
    const existing = await prisma.organization.findUnique({
      where: { name: orgName },
      select: { id: true },
    });
    if (existing) {
      return new Response(
        JSON.stringify({ error: "Organization already exists. Please log in." }),
        { status: 409 }
      );
    }

    // NOTE: for production, HASH this password (bcrypt/argon2).
    // Here we store it as plain text to unblock you quickly.
    const org = await prisma.organization.create({
      data: {
        name: orgName,
        slug: toSlug(orgName),
        customer_password: password,
      },
      select: { id: true, name: true },
    });

    // Very naive token (replace with JWT or secure session later)
    const token = `cust_${org.id}_${Date.now()}`;

    return new Response(
      JSON.stringify({
        token,
        orgId: org.id,
        orgName: org.name,
        // Optional echo of "contact name" if you collected it from the form
        contactName: name || null,
      }),
      { status: 200 }
    );
  } catch (e) {
    console.error("public/signup", e);
    return new Response(JSON.stringify({ error: "Failed to sign up" }), { status: 500 });
  }
}
