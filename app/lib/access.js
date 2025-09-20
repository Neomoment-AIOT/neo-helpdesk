import { prisma } from "./prisma";

export async function getOrgSubtreeIds(rootId) {
  const rows = await prisma.$queryRaw`
    WITH RECURSIVE subtree AS (
      SELECT id FROM organizations WHERE id = ${rootId}
      UNION ALL
      SELECT o.id FROM organizations o
      JOIN subtree s ON o.parent_id = s.id
    ) SELECT id FROM subtree;
  `;
  return rows.map(r => r.id);
}

export async function canManageOrg(user, targetOrgId) {
  if (!user || !user.organization_id) return false;
  if (user.role === "MANAGER") {
    const ids = await getOrgSubtreeIds(user.organization_id);
    return ids.includes(targetOrgId);
  }
  return false;
}

export async function canWriteTicket(user, orgId) {
  if (!user || !user.organization_id) return false;
  if (user.role === "MANAGER") {
    const ids = await getOrgSubtreeIds(user.organization_id);
    return ids.includes(orgId);
  }
  return user.organization_id === orgId; // dev/tester: own org only
}
