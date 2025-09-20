import prisma from "../../../lib/prisma";

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page") || 1);
    const pageSize = Number(url.searchParams.get("pageSize") || 20);
    const q = url.searchParams.get("q")?.trim();
    const orgId = url.searchParams.get("orgId");
    const type = url.searchParams.get("type"); // INTERNAL | EXTERNAL
    const assigneeId = url.searchParams.get("assigneeId"); // <— NEW

    const where = {};
    if (q) {
      where.OR = [
        { ticket_id: { contains: q, mode: "insensitive" } },
        { client_name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { organization: { name: { contains: q, mode: "insensitive" } } },
      ];
    }
    if (orgId && orgId !== "all") where.organization_id = Number(orgId);
    if (type && type !== "all") where.ticket_type = type;
    if (assigneeId) where.assigned_to_id = Number(assigneeId); // <— NEW

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          organization: true,
          team: true,
          assignee: true,
          histories: false, // set true if you want history
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    return new Response(JSON.stringify({ tickets, total }), { status: 200 });
  } catch (e) {
    console.error("tickets/list", e);
    return new Response(JSON.stringify({ error: "Failed to list tickets" }), { status: 500 });
  }
}
