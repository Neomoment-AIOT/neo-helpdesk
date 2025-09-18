// app/api/members/list/route.js
import prisma from '../../../lib/prisma';

export async function GET() {
  try {
    const members = await prisma.member.findMany({
      orderBy: { name: 'asc' },
      include: {
        team: true, // optional primary team
        teamLinks: { include: { team: true } },
        skillLinks: { include: { skill: true } },
      },
    });

    const shaped = members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      is_leader: m.is_leader,
      teams: [
        ...(m.team ? [{ id: m.team.id, name: m.team.name }] : []),
        ...m.teamLinks.map((lk) => ({ id: lk.team.id, name: lk.team.name })),
      ],
      skills: m.skillLinks.map((lk) => ({ id: lk.skill.id, skill: lk.skill.skill })),
    }));

    return new Response(JSON.stringify({ members: shaped }), { status: 200 });
  } catch (e) {
    console.error('members/list', e);
    return new Response(JSON.stringify({ error: 'Failed to fetch members' }), { status: 500 });
  }
}
