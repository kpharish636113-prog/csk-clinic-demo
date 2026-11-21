import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../src/auth/auth.types';
import { ExternalMedicalRecordsService } from '../src/patients/external-medical-records.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('ExternalMedicalRecordsService', () => {
  const patientId = '00000000-0000-4000-8000-000000000003';
  const user: AuthenticatedUser = {
    sub: '00000000-0000-4000-8000-000000000001',
    clinicId: '00000000-0000-4000-8000-000000000002',
    role: 'DOCTOR',
  };
  const input = {
    recordDate: '2021-08-15',
    recordType: 'Discharge summary',
    doctorName: '  Dr. Previous  ',
    facilityName: '  Outside Hospital  ',
    diagnosis: '  Recovery noted  ',
  };

  it('creates a clinic-scoped outside record and records an audit event', async () => {
    const savedRecord = { id: 'outside-1', patientId, ...input };
    const transaction = {
      patient: { findFirst: jest.fn().mockResolvedValue({ id: patientId }) },
      externalMedicalRecord: { create: jest.fn().mockResolvedValue(savedRecord) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
    } as unknown as PrismaService;

    await expect(new ExternalMedicalRecordsService(prisma).create(user, patientId, input))
      .resolves.toEqual(savedRecord);
    expect(transaction.externalMedicalRecord.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        clinicId: user.clinicId,
        patientId,
        createdById: user.sub,
        doctorName: 'Dr. Previous',
        facilityName: 'Outside Hospital',
        diagnosis: 'Recovery noted',
      }),
    }));
    expect(transaction.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'EXTERNAL_MEDICAL_RECORD_CREATED',
        resource: 'external_medical_record',
      }),
    }));
  });

  it('does not access outside records when the patient is not in the caller clinic', async () => {
    const transaction = {
      patient: { findFirst: jest.fn().mockResolvedValue(null) },
      externalMedicalRecord: { findMany: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
    } as unknown as PrismaService;

    await expect(new ExternalMedicalRecordsService(prisma).list(user, patientId))
      .rejects.toBeInstanceOf(NotFoundException);
    expect(transaction.externalMedicalRecord.findMany).not.toHaveBeenCalled();
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only provider identity before writing a record', async () => {
    const prisma = { $transaction: jest.fn() } as unknown as PrismaService;

    await expect(new ExternalMedicalRecordsService(prisma).create(user, patientId, {
      ...input,
      doctorName: '   ',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
