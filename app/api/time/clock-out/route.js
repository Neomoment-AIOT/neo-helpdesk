import prisma from "../../../lib/prisma";

function sumDurations(logs) {
  return logs.reduce((acc, l) => acc + (l.duration_seconds ?? 0), 0);
}

export async function POST(req) {
  try {
    const { ticketId, memberId } = await req.json();
    if (!ticketId || !memberId) {
      return new Response(JSON.stringify({ error: "ticketId and memberId required" }), { status: 400 });
    }

    const open = await prisma.ticketTimeLog.findFirst({
      where: { ticket_id: Number(ticketId), member_id: Number(memberId), end_time: null },
      orderBy: { start_time: "desc" }
    });
    if (!open) {
      return new Response(JSON.stringify({ error: "No running timer found" }), { status: 404 });
    }

    const now = new Date();
    const seconds = Math.max(0, Math.floor((now.getTime() - new Date(open.start_time).getTime()) / 1000));

    await prisma.ticketTimeLog.update({
      where: { id: open.id },
      data: { end_time: now, duration_seconds: seconds }
    });

    // Return new cumulative for this ticket (all members) — adjust if you want per-member only
    const all = await prisma.ticketTimeLog.findMany({
      where: { ticket_id: Number(ticketId), duration_seconds: { not: null } },
      select: { duration_seconds: true }
    });

    return new Response(JSON.stringify({
      addedSeconds: seconds,
      totalSeconds: sumDurations(all),
    }), { status: 200 });
  } catch (e) {
    console.error("clock-out", e);
    return new Response(JSON.stringify({ error: "Failed to clock out" }), { status: 500 });
  }
}
