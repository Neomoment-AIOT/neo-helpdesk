// app/api/tickets/assign/route.js
import prisma from "../../../lib/prisma";
import { sendAssignmentEmail } from "../../../utils/email";

export async function POST(req) {
  try {
    const { ticketId, memberId } = await req.json();

    if (!ticketId || !memberId) {
      return new Response(
        JSON.stringify({ error: "ticketId and memberId required" }),
        { status: 400 }
      );
    }

    const memberIdNum = Number(memberId);
    if (Number.isNaN(memberIdNum)) {
      return new Response(JSON.stringify({ error: "Invalid memberId" }), { status: 400 });
    }

    // 1) Find member (Prisma model name is singular)
    const member = await prisma.member.findUnique({
      where: { id: memberIdNum },
      select: { id: true, name: true, email: true },
    });

    // 2) Find ticket by its unique business ID
    const ticket = await prisma.ticket.findUnique({
      where: { ticket_id: ticketId },
      select: {
        id: true,
        ticket_id: true,
        description: true,
        status: true,
        started_at: true,
      },
    });

    if (!member || !ticket) {
      return new Response(
        JSON.stringify({ error: "Member or ticket not found" }),
        { status: 404 }
      );
    }

    // Next status & timestamps
    const newStatus = ticket.status === "NOT_STARTED" ? "IN_PROGRESS" : ticket.status;

    // 3) Update ticket (relations are 'assignee' and 'team' in your Prisma schema)
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        assigned_to_id: member.id,
        status: newStatus,
        started_at: ticket.started_at ?? new Date(),
        updated_at: new Date(),
      },
      include: {
        assignee: true, // <- Member
        team: true,     // <- Team
        organization: true,
      },
    });

    // 4) Add history entry (model is TicketHistory)
    await prisma.ticketHistory.create({
      data: {
        ticket_id: ticket.id,
        status: newStatus,
        note: `Assigned to ${member.name}`,
        changed_by: "Admin",
      },
    });

    // 5) Try to send email (non-blocking)
    if (member.email) {
      try {
        await sendAssignmentEmail({
          to: member.email,
          memberName: member.name,
          ticketId: updatedTicket.ticket_id,
          ticketDescription: updatedTicket.description,
        });
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
        // We don't fail the API on email issues.
      }
    }

    return new Response(JSON.stringify({ success: true, ticket: updatedTicket }), {
      status: 200,
    });
  } catch (err) {
    console.error("assign ticket error:", err);
    return new Response(JSON.stringify({ error: "Failed to assign ticket" }), {
      status: 500,
    });
  }
}
