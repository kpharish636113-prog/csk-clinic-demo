import { AuthenticatedUser } from '../src/auth/auth.types';
import { PatientEncountersService } from '../src/patients/patient-encounters.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('PatientEncountersService', () => {
  const patientId = '00000000-0000-4000-8000-000000000003';
  const user: AuthenticatedUser = {
    sub: '00000000-0000-4000-8000-000000000001',
    clinicId: '00000000-0000-4000-8000-000000000002',
    role: 'CLINIC_ADMIN',
  };

  it('lists existing encounter history and audits the read', async () => {
    const records = [{ id: 'encounter-1', patientId }];
    const transaction = {
      patient: { findFirst: jest.fn().mockResolvedValue({ id: patientId }) },
      patientEncounter: { findMany: jest.fn().mockResolvedValue(records) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
    } as unknown as PrismaService;

    await expect(new PatientEncountersService(prisma).list(user, patientId)).resolves.toEqual(records);
    expect(transaction.patientEncounter.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { clinicId: user.clinicId, patientId },
    }));
    expect(transaction.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'CLINICAL_RECORDS_VIEWED', resourceId: patientId }),
    }));
  });

  it('returns prior nurse intake records with their visit and author details', async () => {
    const archivedIntakes = [{ id: 'intake-1', patientId, chiefComplaint: 'Headache' }];
    const transaction = {
      patient: { findFirst: jest.fn().mockResolvedValue({ id: patientId }) },
      nurseIntake: { findMany: jest.fn().mockResolvedValue(archivedIntakes) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
    } as unknown as PrismaService;

    await expect(new PatientEncountersService(prisma).listIntakes(user, patientId))
      .resolves.toEqual(archivedIntakes);
    expect(transaction.nurseIntake.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { clinicId: user.clinicId, patientId },
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
    }));
  });

  it('does not expose encounter create or discharge operations', () => {
    expect(PatientEncountersService.prototype).not.toHaveProperty('create');
    expect(PatientEncountersService.prototype).not.toHaveProperty('discharge');
  });
});
