import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma"; // adjust path if needed
export async function GET(req, context) {
  try {
    const { ticketId } = context.params;

    // Use findFirst instead of findUnique to ensure string match
    const ticket = await prisma.tickets.findFirst({
      where: { ticket_id: ticketId },
      include: {
        ticket_histories: true,
        members: true,
        teams: true,
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
