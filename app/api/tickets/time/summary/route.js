// app/api/tickets/time/summary/route.js
import prisma from "../../../../lib/prisma";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const ids = (searchParams.get("ids") || "")
      .split(",")
      .map((s) => Number(s))
      .filter(Boolean);
    if (!ids.length) {
      return new Response(JSON.stringify({ summary: [] }), { status: 200 });
    }

    // Sum finished logs
    const finished = await prisma.ticketTimeLog.groupBy({
      by: ["ticket_id"],
      where: { ticket_id: { in: ids }, end_time: { not: null } },
      _sum: { duration_seconds: true },
    });

    // Active logs (no end_time)
    const active = await prisma.ticketTimeLog.findMany({
      where: { ticket_id: { in: ids }, end_time: null },
      select: { ticket_id: true, start_time: true },
    });

    const sumMap = Object.fromEntries(
      finished.map((r) => [r.ticket_id, r._sum.duration_seconds || 0])
    );
    const activeMap = Object.fromEntries(
      active.map((r) => [r.ticket_id, r.start_time])
    );

    const summary = ids.map((id) => ({
      ticketId: id,
      total_seconds: sumMap[id] || 0,
      active_started_at: activeMap[id] || null,
    }));

    return new Response(JSON.stringify({ summary }), { status: 200 });
  } catch (e) {
    console.error("time/summary", e);
    return new Response(JSON.stringify({ error: "Failed" }), { status: 500 });
  }
}
