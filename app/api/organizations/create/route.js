import prisma from '../../../lib/prisma';

export async function POST(req) {
  try {
    const { name, slug } = await req.json();
    if (!name?.trim()) return new Response(JSON.stringify({ error: 'name required' }), { status: 400 });
    const organization = await prisma.organization.create({ data: { name: name.trim(), slug: slug?.trim() || null } });
    return new Response(JSON.stringify({ organization }), { status: 201 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Failed to create organization' }), { status: 500 });
  }
}
