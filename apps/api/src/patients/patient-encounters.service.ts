import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { writeAuditLog } from '../audit/audit-log.utils';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PatientEncountersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser, patientId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const patient = await transaction.patient.findFirst({
        where: { id: patientId, clinicId: user.clinicId },
        select: { id: true },
      });
      if (!patient) throw new NotFoundException('Patient not found.');

      const encounters = await transaction.patientEncounter.findMany({
        where: { clinicId: user.clinicId, patientId },
        orderBy: [{ visitDate: 'desc' }, { createdAt: 'desc' }],
        include: {
          reports: { orderBy: [{ reportDate: 'asc' }, { createdAt: 'asc' }] },
          prescriptionItems: {
            include: { medicine: { select: { id: true, name: true, quantity: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      await this.auditHistoryView(transaction, user, patientId, 'encounters', encounters.length);
      return encounters;
    });
  }

  async listIntakes(user: AuthenticatedUser, patientId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const patient = await transaction.patient.findFirst({
        where: { id: patientId, clinicId: user.clinicId },
        select: { id: true },
      });
      if (!patient) throw new NotFoundException('Patient not found.');

      const intakes = await transaction.nurseIntake.findMany({
        where: { clinicId: user.clinicId, patientId },
        orderBy: [{ createdAt: 'desc' }],
        include: {
          enteredBy: { select: { email: true } },
          queueToken: {
            select: {
              tokenNumber: true,
              queueDate: true,
              doctor: { select: { email: true } },
            },
          },
        },
      });
      await this.auditHistoryView(transaction, user, patientId, 'archived_intakes', intakes.length);
      return intakes;
    });
  }

  private async auditHistoryView(
    transaction: Prisma.TransactionClient,
    user: AuthenticatedUser,
    patientId: string,
    recordType: 'encounters' | 'archived_intakes',
    resultCount: number,
  ) {
    await writeAuditLog(transaction, {
      clinicId: user.clinicId,
      userId: user.sub,
      action: 'CLINICAL_RECORDS_VIEWED',
      resource: 'patient',
      resourceId: patientId,
      metadata: { recordType, resultCount },
    });
  }
}
