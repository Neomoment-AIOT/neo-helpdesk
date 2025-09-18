// app/api/skills/add/route.js
import prisma from '../../../lib/prisma';

export async function POST(req) {
  try {
    const { skill } = await req.json();
    if (!skill?.trim()) return new Response(JSON.stringify({ error: 'skill is required' }), { status: 400 });

    const created = await prisma.skill.create({ data: { skill: skill.trim() } });
    return new Response(JSON.stringify({ skill: created }), { status: 201 });
  } catch (e) {
    console.error('skills/add', e);
    return new Response(JSON.stringify({ error: 'Failed to add skill' }), { status: 500 });
  }
}
