import prisma from "../../../lib/prisma";

export async function POST(req) {
  try {
    const { memberId, ticketIds } = await req.json();
    if (!memberId || !Array.isArray(ticketIds) || !ticketIds.length) {
      return new Response(JSON.stringify({ error: "memberId and ticketIds[] required" }), { status: 400 });
    }

    const logs = await prisma.ticketTimeLog.findMany({
      where: { ticket_id: { in: ticketIds.map(Number) }, member_id: Number(memberId) },
      select: { ticket_id: true, start_time: true, end_time: true, duration_seconds: true }
    });

    const result = {};
    for (const id of ticketIds.map(Number)) {
      result[id] = { runningStart: null, totalSeconds: 0 };
    }

    for (const l of logs) {
      if (!l.end_time) {
        // running
        result[l.ticket_id].runningStart = l.start_time;
      } else {
        result[l.ticket_id].totalSeconds += (l.duration_seconds ?? 0);
      }
    }

    return new Response(JSON.stringify({ summary: result }), { status: 200 });
  } catch (e) {
    console.error("my time summary", e);
    return new Response(JSON.stringify({ error: "Failed to load time summary" }), { status: 500 });
  }
}
