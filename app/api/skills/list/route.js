// app/api/skills/list/route.js
import prisma from '../../../lib/prisma';

export async function GET() {
  try {
    const skills = await prisma.skill.findMany({ orderBy: { skill: 'asc' } });
    return new Response(JSON.stringify({ skills }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Failed to fetch skills' }), { status: 500 });
  }
}
