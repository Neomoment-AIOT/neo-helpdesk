import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;
export const prisma = globalForPrisma._prisma || new PrismaClient({
  log: process.env.NODE_ENV === "production" ? [] : ["error", "warn"],
});

if (!globalForPrisma._prisma) {
  globalForPrisma._prisma = prisma;
}
