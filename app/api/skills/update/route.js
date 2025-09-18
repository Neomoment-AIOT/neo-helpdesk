// app/api/skills/update/route.js
import prisma from '../../../lib/prisma';

export async function POST(req) {
  try {
    const { id, skill } = await req.json();
    if (!id || !skill?.trim()) return new Response(JSON.stringify({ error: 'id and skill are required' }), { status: 400 });

    const updated = await prisma.skill.update({
      where: { id: Number(id) },
      data: { skill: skill.trim() },
    });
    return new Response(JSON.stringify(updated), { status: 200 });
  } catch (e) {
    console.error('skills/update', e);
    return new Response(JSON.stringify({ error: 'Failed to update skill' }), { status: 500 });
  }
}
