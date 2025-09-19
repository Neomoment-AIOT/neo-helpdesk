// app/api/tickets/time/stop/route.js
import prisma from "../../../../lib/prisma";

export async function POST(req) {
  try {
    const { ticketId, memberId } = await req.json();
    if (!ticketId) return new Response(JSON.stringify({ error: "ticketId required" }), { status: 400 });

    const log = await prisma.ticketTimeLog.findFirst({
      where: { ticket_id: ticketId, end_time: null, ...(memberId ? { member_id: memberId } : {}) },
    });
    if (!log) return new Response(JSON.stringify({ error: "No active timer" }), { status: 404 });

    const end = new Date();
    const added = Math.max(0, Math.floor((end.getTime() - new Date(log.start_time).getTime()) / 1000));

    await prisma.ticketTimeLog.update({
      where: { id: log.id },
      data: { end_time: end, duration_seconds: added },
    });

    const agg = await prisma.ticketTimeLog.aggregate({
      where: { ticket_id: ticketId, end_time: { not: null } },
      _sum: { duration_seconds: true },
    });

    const total = (agg._sum.duration_seconds || 0);

    return new Response(JSON.stringify({ added_seconds: added, total_seconds: total }), { status: 200 });
  } catch (e) {
    console.error("time/stop", e);
    return new Response(JSON.stringify({ error: "Failed to stop timer" }), { status: 500 });
  }
}
