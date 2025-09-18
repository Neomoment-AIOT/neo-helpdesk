// app/api/tickets/create/route.js
import prisma from '../../../lib/prisma'; // ← relative path; adjust if your prisma file is elsewhere

export async function POST(req) {
  try {
    const { client_name, description, organization_id } = await req.json();

    // Basic validation
    if (!client_name?.trim() || !description?.trim() || !organization_id) {
      return new Response(
        JSON.stringify({ error: 'client_name, description and organization_id are required' }),
        { status: 400 }
      );
    }

    // DO NOT pass ticket_id — Postgres will generate it.
    const created = await prisma.ticket.create({
      data: {
        client_name: client_name.trim(),
        description: description.trim(),
        organization: { connect: { id: Number(organization_id) } },
        ticket_type: 'EXTERNAL',     // force external for customer flow
        status: 'NOT_STARTED',
      },
      select: {
        id: true,
        ticket_id: true,             // returned from DB default
        client_name: true,
        description: true,
        ticket_type: true,
        status: true,
        created_at: true,
        organization: { select: { id: true, name: true } },
      },
    });

    // Send the generated ticket_id back so you can show it immediately
    return new Response(
      JSON.stringify({ ticket: created, ticket_id: created.ticket_id }),
      { status: 201 }
    );
  } catch (e) {
    console.error('create ticket error', e);
    return new Response(JSON.stringify({ error: 'Failed to create ticket' }), { status: 500 });
  }
}
