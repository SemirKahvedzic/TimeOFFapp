import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function instantiate(): PrismaClient {
  const adapter = new PrismaPg(process.env.DATABASE_URL!);
  return new PrismaClient({ adapter, log: ["error"] });
}

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = instantiate();
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get: (_, prop, receiver) => Reflect.get(getPrisma(), prop, receiver),
});
