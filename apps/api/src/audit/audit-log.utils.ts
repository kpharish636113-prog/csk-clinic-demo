import { Prisma } from '@prisma/client';

type AuditLogWriter = Pick<Prisma.TransactionClient, 'auditLog'>;

interface AuditLogEvent {
  clinicId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Prisma.InputJsonObject;
}

export async function writeAuditLog(writer: AuditLogWriter, event: AuditLogEvent): Promise<void> {
  await writer.auditLog.create({
    data: {
      clinicId: event.clinicId,
      userId: event.userId,
      action: event.action,
      resource: event.resource,
      ...(event.resourceId ? { resourceId: event.resourceId } : {}),
      ...(event.metadata ? { metadata: event.metadata } : {}),
    },
  });
}
