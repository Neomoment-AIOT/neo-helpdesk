import prisma from "../../../lib/prisma";

export async function POST(req) {
  try {
    const { ticketId, memberId } = await req.json();
    if (!ticketId || !memberId) {
      return new Response(JSON.stringify({ error: "ticketId and memberId required" }), { status: 400 });
    }

    // Block double-running per (ticket, member)
    const open = await prisma.ticketTimeLog.findFirst({
      where: { ticket_id: Number(ticketId), member_id: Number(memberId), end_time: null },
      select: { id: true }
    });
    if (open) {
      return new Response(JSON.stringify({ error: "Timer already running" }), { status: 409 });
    }

    const started = await prisma.ticketTimeLog.create({
      data: {
        ticket_id: Number(ticketId),
        member_id: Number(memberId),
        start_time: new Date(),
      },
      select: { id: true, start_time: true }
    });

    return new Response(JSON.stringify({ runningStart: started.start_time }), { status: 200 });
  } catch (e) {
    console.error("clock-in", e);
    return new Response(JSON.stringify({ error: "Failed to clock in" }), { status: 500 });
  }
}
