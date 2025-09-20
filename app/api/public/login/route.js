// app/api/public/login/route.js
import prisma from "../../../lib/prisma";

export async function POST(req) {
  try {
    const { organizationName, password } = await req.json();
    if (!organizationName?.trim() || !password?.trim()) {
      return new Response(JSON.stringify({ error: "Organization name and password are required" }), { status: 400 });
    }

    let org;
    try {
      org = await prisma.organization.findUnique({
        where: { name: organizationName.trim() },
        select: { id: true, name: true, customer_password: true },
      });
    } catch (e) {
      // P2022 usually means column missing
      return new Response(
        JSON.stringify({ error: "Schema out of date. Run the migration to add organizations.customer_password." }),
        { status: 500 }
      );
    }

    if (!org) return new Response(JSON.stringify({ error: "Organization not found" }), { status: 404 });
    if (org.customer_password !== password) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });
    }

    const token = `cust_${org.id}_${Date.now()}`;
    return new Response(JSON.stringify({ token, orgId: org.id, orgName: org.name }), { status: 200 });
  } catch (e) {
    console.error("public/login", e);
    return new Response(JSON.stringify({ error: "Failed to log in" }), { status: 500 });
  }
}
