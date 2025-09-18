import prisma from "../../../lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: "Username and password required" }),
        { status: 400 }
      );
    }

    // Find user
    const member = await prisma.members.findUnique({
      where: { username },
    });
    if (!member) {
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        { status: 401 }
      );
    }

    // Compare passwords
    const match = await bcrypt.compare(password, member.password);
    if (!match) {
      return new Response(
        JSON.stringify({ error: "Invalid credentials" }),
        { status: 401 }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        memberId: member.id,
        name: member.name,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Login error:", err);
    return new Response(
      JSON.stringify({ error: "Login failed" }),
      { status: 500 }
    );
  }
}
