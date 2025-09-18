import prisma from "../../../lib/prisma";

export async function PATCH(req) {
  try {
    const { ticketId, status, changedBy = "Member" } = await req.json();
    if (!ticketId || !status) {
      return new Response(JSON.stringify({ error: "ticketId and status required" }), { status: 400 });
    }

    // Update and include relations you display on cards
    const updated = await prisma.ticket.update({
      where: { id: Number(ticketId) },
      data: { status, updated_at: new Date() },
      include: {
        organization: true,
        team: true,
        assignee: true,
      },
    });

    // History entry
    await prisma.ticketHistory.create({
      data: {
        ticket_id: updated.id,
        status,
        note: `Status changed to ${status}`,
        changed_by: changedBy,
      },
    });

    return new Response(JSON.stringify({ ticket: updated }), { status: 200 });
  } catch (e) {
    console.error("tickets/update-status", e);
    return new Response(JSON.stringify({ error: "Failed to update status" }), { status: 500 });
  }
}
