// app/api/internal/signupmember/route.js
import prisma from "../../../lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req) {
  try {
    const {
      name,
      email,           // optional now
      username,        // optional
      password,
      role,
      teamId,
      skillIds = [],
      is_leader = false,
    } = await req.json();

    if (!name?.trim() || !password?.trim() || (!email?.trim() && !username?.trim())) {
      return new Response(JSON.stringify({ error: "name, password and email or username are required" }), { status: 400 });
    }

    if (email?.trim()) {
      const exists = await prisma.member.findUnique({ where: { email: email.trim() } });
      if (exists) return new Response(JSON.stringify({ error: "Email already in use" }), { status: 409 });
    }
    if (username?.trim()) {
      const existsU = await prisma.member.findUnique({ where: { username: username.trim() } });
      if (existsU) return new Response(JSON.stringify({ error: "Username already in use" }), { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const created = await prisma.member.create({
      data: {
        name: name.trim(),
        // only include keys when provided; avoids passing nulls
        ...(email?.trim() ? { email: email.trim() } : {}),
        ...(username?.trim() ? { username: username.trim() } : {}),
        password: hashed,
        role: role || null,
        is_leader,
        ...(teamId ? { team: { connect: { id: Number(teamId) } } } : {}),
      },
      select: {
        id: true, name: true, email: true, username: true,
        role: true, is_leader: true, team_id: true,
      }
    });

    if (teamId) {
      await prisma.membersOnTeams.upsert({
        where: { memberId_teamId: { memberId: created.id, teamId: Number(teamId) } },
        update: {},
        create: { memberId: created.id, teamId: Number(teamId) },
      });
    }

    if (Array.isArray(skillIds) && skillIds.length) {
      await prisma.$transaction(
        skillIds.map((sid) =>
          prisma.membersOnSkills.upsert({
            where: { memberId_skillId: { memberId: created.id, skillId: Number(sid) } },
            update: {},
            create: { memberId: created.id, skillId: Number(sid) },
          })
        )
      );
    }

    const token = `admin_${created.id}_${Date.now()}`;

    return new Response(JSON.stringify({ token, member: created }), { status: 201 });
  } catch (e) {
    console.error("internal/signupmember", e);
    return new Response(JSON.stringify({ error: "Failed to sign up member" }), { status: 500 });
  }
}
