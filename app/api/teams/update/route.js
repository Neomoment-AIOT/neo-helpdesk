// app/api/teams/update/route.js
import prisma from '../../../lib/prisma';

export async function POST(req) {
  try {
    const { id, name, description } = await req.json();
    if (!id || !name?.trim()) {
      return new Response(JSON.stringify({ error: 'id and name are required' }), { status: 400 });
    }

    const updated = await prisma.team.update({
      where: { id: Number(id) },
      data: {
        name: name.trim(),
        ...(description !== undefined ? { description } : {}),
      },
    });

    // return shape your UI expects
    return new Response(JSON.stringify({ team: updated }), { status: 200 });
  } catch (err) {
    console.error('Update team error:', err);
    // unique constraint friendly message
    if (String(err?.code) === 'P2002') {
      return new Response(JSON.stringify({ error: 'Team name must be unique' }), { status: 409 });
    }
    return new Response(JSON.stringify({ error: 'Failed to update team' }), { status: 500 });
  }
}
