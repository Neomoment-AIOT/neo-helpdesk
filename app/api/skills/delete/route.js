import prisma from "../../../lib/prisma";

// app/api/skills/delete/route.js
export async function POST(req) {
  try {
    const { id } = await req.json();
    if (!id) return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });

    // remove join rows first (FK safety), then delete skill
    await prisma.membersOnSkills.deleteMany({ where: { skillId: Number(id) } });
    await prisma.skill.delete({ where: { id: Number(id) } });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    console.error('skills/delete', e);
    return new Response(JSON.stringify({ error: 'Failed to delete skill' }), { status: 500 });
  }
}
