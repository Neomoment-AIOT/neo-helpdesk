// app/api/organizations/list-for-customer/route.ts
import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const parentOrgId = Number(searchParams.get("parentOrgId"));
  if (!parentOrgId) return NextResponse.json({ organizations: [] });

  const parent = await prisma.organization.findUnique({
    where: { id: parentOrgId },
    include: { children: true },
  });

  if (!parent) return NextResponse.json({ organizations: [] });

  return NextResponse.json({
    parent: { id: parent.id, name: parent.name },
    children: parent.children.map(c => ({ id: c.id, name: c.name })),
  });
}
