// app/api/teams/delete/route.js
import prisma from '../../../lib/prisma';

export async function POST(req) {
  try {
    const { id } = await req.json();
    if (!id) {
      return new Response(JSON.stringify({ error: 'id is required' }), { status: 400 });
    }
    const teamId = Number(id);

    // Clean up relations first to avoid FK errors
    await prisma.$transaction([
      // remove many-to-many links
      prisma.membersOnTeams.deleteMany({ where: { teamId } }),
      // null out primary team pointer on members
      prisma.member.updateMany({ where: { team_id: teamId }, data: { team_id: null } }),
      // null out tickets.team_id
      prisma.ticket.updateMany({ where: { team_id: teamId }, data: { team_id: null } }),
      // finally delete the team
      prisma.team.delete({ where: { id: teamId } }),
    ]);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error('Delete team error:', err);
    return new Response(JSON.stringify({ error: 'Failed to delete team' }), { status: 500 });
  }
}
