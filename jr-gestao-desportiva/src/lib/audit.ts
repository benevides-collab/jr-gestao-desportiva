import type { Prisma } from "@prisma/client";

import { getPrisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type AuditInput = {
  user: SessionUser | null;
  action: string;
  entity: string;
  entityId?: string;
  oldValues?: Prisma.InputJsonValue;
  newValues?: Prisma.InputJsonValue;
};

export async function registerAuditLog(input: AuditInput) {
  try {
    await getPrisma().auditLog.create({
      data: {
        userId:
          input.user?.id && uuidPattern.test(input.user.id) ? input.user.id : null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        oldValues: input.oldValues === undefined ? undefined : input.oldValues,
        newValues: input.newValues === undefined ? undefined : input.newValues,
      },
    });
  } catch {
    // Audit logging must not block operational flows.
  }
}
