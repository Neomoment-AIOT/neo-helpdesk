// app/api/teams/add-member/route.js
import prisma from '../../../lib/prisma';

export async function POST(req) {
  try {
    const { teamId, memberId } = await req.json();
    if (!teamId || !memberId) {
      return new Response(JSON.stringify({ error: 'teamId and memberId are required' }), { status: 400 });
    }
    await prisma.membersOnTeams.upsert({
      where: { memberId_teamId: { memberId: Number(memberId), teamId: Number(teamId) } },
      create: { memberId: Number(memberId), teamId: Number(teamId) },
      update: {},
    });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error('Add member to team error:', err);
    return new Response(JSON.stringify({ error: 'Failed to add member to team' }), { status: 500 });
  }
}
