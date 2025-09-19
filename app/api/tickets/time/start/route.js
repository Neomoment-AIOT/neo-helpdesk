// app/api/tickets/time/start/route.js
import prisma from "../../../../lib/prisma";

export async function POST(req) {
  try {
    const { ticketId, memberId } = await req.json();
    if (!ticketId) return new Response(JSON.stringify({ error: "ticketId required" }), { status: 400 });

    // Guard: no duplicate running log for this member+ticket
    const existing = await prisma.ticketTimeLog.findFirst({
      where: { ticket_id: ticketId, end_time: null, ...(memberId ? { member_id: memberId } : {}) },
    });
    if (existing) {
      return new Response(JSON.stringify({ started_at: existing.start_time }), { status: 200 });
    }

    const created = await prisma.ticketTimeLog.create({
      data: {
        ticket_id: ticketId,
        member_id: memberId ?? null, // if nullable in DB; else require it
        start_time: new Date(),
      },
      select: { start_time: true },
    });

    return new Response(JSON.stringify({ started_at: created.start_time }), { status: 200 });
  } catch (e) {
    console.error("time/start", e);
    return new Response(JSON.stringify({ error: "Failed to start timer" }), { status: 500 });
  }
}
