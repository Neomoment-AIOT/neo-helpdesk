// app/api/teams/add/route.js
import prisma from '../../../lib/prisma';

export async function POST(req) {
  try {
    const { name, description } = await req.json();
    if (!name?.trim()) {
      return new Response(JSON.stringify({ error: 'name is required' }), { status: 400 });
    }
    const created = await prisma.team.create({
      data: { name: name.trim(), description: description ?? null },
    });
    return new Response(JSON.stringify({ team: created }), { status: 201 });
  } catch (err) {
    console.error('Add team error:', err);
    if (String(err?.code) === 'P2002') {
      return new Response(JSON.stringify({ error: 'Team name must be unique' }), { status: 409 });
    }
    return new Response(JSON.stringify({ error: 'Failed to add team' }), { status: 500 });
  }
}
