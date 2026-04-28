import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function instantiate(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. Local dev: copy your Neon URL into .env. " +
      "Production: set it in your host's env panel."
    );
  }
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter, log: ["error"] });
}

function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = instantiate();
  }
  return globalForPrisma.prisma;
}

// Lazy proxy: instantiates the Prisma client on first property access.
// This lets `next build` run in environments where DATABASE_URL only
// becomes available at request time (e.g. Netlify dashboard secrets,
// the Neon extension's runtime-only env vars). Async callers that
// `.catch()` will see the missing-DATABASE_URL error as a rejection.
export const prisma = new Proxy({} as PrismaClient, {
  get: (_, prop, receiver) => Reflect.get(getPrisma(), prop, receiver),
});
