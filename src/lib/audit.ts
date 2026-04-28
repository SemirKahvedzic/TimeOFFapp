import { prisma } from "./db";

export async function audit(opts: {
  actorId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: unknown;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: opts.actorId,
        action: opts.action,
        targetType: opts.targetType,
        targetId: opts.targetId,
        metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
      },
    });
  } catch {
    // never let audit logging break the user-facing operation
  }
}
