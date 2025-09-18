import prisma from '../../../lib/prisma';

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      orderBy: { name: 'asc' },
    });
    return new Response(JSON.stringify({ teams }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Failed to fetch teams' }), { status: 500 });
  }
}
