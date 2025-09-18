import prisma from '../../../lib/prisma';

const toInt = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const page = toInt(url.searchParams.get('page'), 1);
    const pageSize = Math.min(toInt(url.searchParams.get('pageSize'), 20), 100);
    const q = (url.searchParams.get('q') || '').trim();
    const orgId = url.searchParams.get('orgId');
    const type = url.searchParams.get('type'); // INTERNAL | EXTERNAL

    const where = {};
    if (q) {
      where.OR = [
        { ticket_id: { contains: q, mode: 'insensitive' } },
        { client_name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { organization: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }
    if (orgId && orgId !== 'all') where.organization_id = Number(orgId);
    if (type && (type === 'INTERNAL' || type === 'EXTERNAL')) where.ticket_type = type;

    const [total, tickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { organization: true, team: true, assignee: true },
      }),
    ]);

    return new Response(JSON.stringify({ total, tickets }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Failed to fetch tickets' }), { status: 500 });
  }
}
