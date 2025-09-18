import prisma from "../../../lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const { username, password, email, contact, name } = await req.json();

    if (!username || !password || !email || !contact || !name) {
      return new Response(
        JSON.stringify({ error: "All fields required" }),
        { status: 400 }
      );
    }

    // Check if username already exists
    const existing = await prisma.members.findUnique({
      where: { username },
    });
    if (existing) {
      return new Response(
        JSON.stringify({ error: "Username already exists" }),
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.members.create({
      data: {
        username,
        password: hashedPassword,
        email,
        contact,
        name,
      },
    });

    return new Response(
      JSON.stringify({ success: true, userId: user.id }),
      { status: 201 }
    );
  } catch (err) {
    console.error("Signup error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to create user" }),
      { status: 500 }
    );
  }
}
