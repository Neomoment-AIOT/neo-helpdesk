// app/api/skills/add-member/route.js
import prisma from '../../../lib/prisma';

export async function POST(req) {
  try {
    const { skillId, memberId } = await req.json();
    if (!skillId || !memberId) {
      return new Response(JSON.stringify({ error: 'skillId and memberId are required' }), { status: 400 });
    }

    // upsert join row (members_skills has composite PK)
    await prisma.membersOnSkills.upsert({
      where: { memberId_skillId: { memberId: Number(memberId), skillId: Number(skillId) } },
      create: { memberId: Number(memberId), skillId: Number(skillId) },
      update: {}, // nothing to update if already exists
    });

    // return the updated member with skills (optional but handy for UI refresh)
    const member = await prisma.member.findUnique({
      where: { id: Number(memberId) },
      include: {
        skillLinks: { include: { skill: true } },
        teamLinks: { include: { team: true } },
        team: true,
      },
    });

    // normalize skills/teams for the UI you wrote
    const skills = (member?.skillLinks || []).map((lk) => ({ id: lk.skill.id, skill: lk.skill.skill }));
    const teams = (member?.teamLinks || []).map((lk) => ({ id: lk.team.id, name: lk.team.name }));

    return new Response(JSON.stringify({ ok: true, member: { ...member, skills, teams } }), { status: 200 });
  } catch (e) {
    console.error('skills/add-member POST error', e);
    return new Response(JSON.stringify({ error: 'Failed to add member to skill' }), { status: 500 });
  }
}
