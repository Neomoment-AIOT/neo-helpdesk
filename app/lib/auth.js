// app/lib/auth.js
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/app/lib/db";

const key = new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change");

export async function signToken(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);
}

export async function verifyToken(token) {
  const { payload } = await jwtVerify(token, key);
  return payload;
}

export function getBearer(req) {
  const h = req.headers.get?.("authorization") || "";
  if (h.startsWith("Bearer ")) return h.slice(7);
  return null;
}

export async function requireAuth(req) {
  const token = getBearer(req) || (req.cookies?.get?.("auth")?.value ?? null);
  if (!token) return { error: "Unauthorized", status: 401 };
  try {
    const payload = await verifyToken(token);
    const user = await prisma.users.findUnique({ where: { id: payload.userId } });
    if (!user) return { error: "Unauthorized", status: 401 };
    return { user, session: payload };
  } catch {
    return { error: "Unauthorized", status: 401 };
  }
}

// Return all descendant org IDs including the root orgId
export async function getOrgDescendantIds(orgId) {
  const rows = await prisma.$queryRawUnsafe(
    `
    WITH RECURSIVE suborgs AS (
      SELECT id FROM organizations WHERE id = $1
      UNION ALL
      SELECT o.id FROM organizations o
      JOIN suborgs s ON o.parent_id = s.id
    )
    SELECT id FROM suborgs;
    `,
    Number(orgId)
  );
  return rows.map((r) => Number(r.id));
}

export async function allowedOrgIdsFor(session) {
  if ((session.role || "").toUpperCase() === "MANAGER") {
    return await getOrgDescendantIds(session.orgId);
  }
  return [Number(session.orgId)];
}
