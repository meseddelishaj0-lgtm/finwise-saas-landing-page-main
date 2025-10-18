import { PrismaClient } from "@prisma/client";

declare global {
  // allow global var in dev to avoid creating new clients during HMR
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
