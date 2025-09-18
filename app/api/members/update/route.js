// app/api/members/update/route.js
import prisma from "../../../lib/prisma";

export async function POST(req) {
  try {
    const { memberId, teamId, role } = await req.json();
    if (!memberId) return new Response(JSON.stringify({ error: "memberId required" }), { status: 400 });

    const updated = await prisma.members.update({
      where: { id: Number(memberId) },
      data: {
        team_id: teamId ? Number(teamId) : null,
        role: role ?? null,
      },
    });

    return new Response(JSON.stringify({ success: true, member: updated }), { status: 200 });
  } catch (err) {
    console.error("member update error:", err);
    return new Response(JSON.stringify({ error: "Failed to update member" }), { status: 500 });
  }
}
