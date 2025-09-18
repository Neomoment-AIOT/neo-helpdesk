// app/api/tickets/internal/create/route.js
import prisma from "../../../../lib/prisma";

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      client_name,        // who is creating ticket
      description,        // textarea
      organization_id,    // dropdown (optional, number)
      ticket_type,        // UI dropdown, we'll ignore & force INTERNAL
    } = body || {};

    if (!client_name?.trim() || !description?.trim()) {
      return new Response(JSON.stringify({ error: "Name and description are required" }), { status: 400 });
    }

    // Build create payload
    const data = {
      client_name: client_name.trim(),
      description: description.trim(),
      ticket_type: "INTERNAL",         // <-- force INTERNAL for this route
      status: "NOT_STARTED",
    };

    if (organization_id) {
      data.organization = { connect: { id: Number(organization_id) } };
    }

    const created = await prisma.ticket.create({
      data,
      include: {
        organization: true,
      },
    });

    // created.ticket_id is returned from DB default
    return new Response(JSON.stringify({
      success: true,
      ticket: created,
      message: `Ticket created: ${created.ticket_id}`,
    }), { status: 201 });
  } catch (e) {
    console.error("internal ticket create error:", e);
    return new Response(JSON.stringify({ error: "Failed to create ticket" }), { status: 500 });
  }
}
