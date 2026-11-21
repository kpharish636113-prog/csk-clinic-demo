import { PatientsService } from '../src/patients/patients.service';
import { AuthenticatedUser } from '../src/auth/auth.types';
import { PrismaService } from '../src/prisma/prisma.service';

describe('PatientsService', () => {
  const user: AuthenticatedUser = {
    sub: '00000000-0000-4000-8000-000000000001',
    clinicId: '00000000-0000-4000-8000-000000000002',
    role: 'CLINIC_ADMIN',
  };

  it('creates a patient and its audit record in the same transaction', async () => {
    const patient = { id: 'patient-1', patientCode: 'CSK-2026-123456' };
    const transaction = {
      patient: {
        create: jest.fn().mockResolvedValue(patient),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };
    const prisma = {
      patient: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
    } as unknown as PrismaService;
    const service = new PatientsService(prisma);

    await expect(service.create(user, { fullName: 'Test Patient', mobile: '9000000000' }))
      .resolves.toEqual(patient);
    expect(transaction.auditLog.create).toHaveBeenCalledWith({
      data: {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'PATIENT_CREATED',
        resource: 'patient',
        resourceId: patient.id,
      },
    });
  });

  it('stores a clinic-scoped patient draft and audits it without exposing its contents', async () => {
    const draft = {
      id: '00000000-0000-4000-8000-000000000003',
      payload: { fullName: 'Draft Patient', mobile: '9000000000' },
    };
    const transaction = {
      patientDraft: {
        create: jest.fn().mockResolvedValue(draft),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-2' }),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
    } as unknown as PrismaService;
    const service = new PatientsService(prisma);

    await expect(service.createDraft(user, {
      payload: { fullName: 'Draft Patient', mobile: '9000000000' },
    })).resolves.toEqual(draft);
    expect(transaction.patientDraft.create).toHaveBeenCalledWith({
      data: {
        clinicId: user.clinicId,
        createdById: user.sub,
        payload: { fullName: 'Draft Patient', mobile: '9000000000' },
      },
      select: { id: true, payload: true, createdAt: true, updatedAt: true },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledWith({
      data: {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'PATIENT_DRAFT_CREATED',
        resource: 'patient_draft',
        resourceId: draft.id,
      },
    });
  });

});
