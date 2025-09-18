import prisma from '../../../lib/prisma';

export async function GET() {
  try {
    const organizations = await prisma.organization.findMany({
      orderBy: { name: 'asc' },
    });
    return new Response(JSON.stringify({ organizations }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Failed to fetch organizations' }), { status: 500 });
  }
}
