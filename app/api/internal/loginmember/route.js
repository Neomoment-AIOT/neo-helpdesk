// app/api/internal/loginmember/route.js
import prisma from "../../../lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const { emailOrUsername, password } = await req.json();
    if (!emailOrUsername?.trim() || !password?.trim()) {
      return new Response(JSON.stringify({ error: "email/username and password are required" }), { status: 400 });
    }

    // find by email or username
    const byEmail = await prisma.member.findUnique({ where: { email: emailOrUsername } }).catch(() => null);
    const member = byEmail ?? await prisma.member.findUnique({ where: { username: emailOrUsername } });

    if (!member) {
      return new Response(JSON.stringify({ error: "Account not found" }), { status: 404 });
    }

    const ok = await bcrypt.compare(password, member.password);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });
    }

    // issue token
    const token = `admin_${member.id}_${Date.now()}`;

    return new Response(
      JSON.stringify({
        token,
        member: {
          id: member.id,
          name: member.name,
          email: member.email,
          username: member.username,
          role: member.role,
          is_leader: member.is_leader,
        }
      }),
      { status: 200 }
    );
  } catch (e) {
    console.error("internal/loginmember", e);
    return new Response(JSON.stringify({ error: "Failed to log in" }), { status: 500 });
  }
}
