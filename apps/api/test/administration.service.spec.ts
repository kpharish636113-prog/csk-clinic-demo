import { ConflictException, NotFoundException } from '@nestjs/common';
import { AdministrationService } from '../src/administration/administration.service';
import { AuthenticatedUser } from '../src/auth/auth.types';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AdministrationService', () => {
  const user: AuthenticatedUser = {
    sub: '00000000-0000-4000-8000-000000000001',
    clinicId: '00000000-0000-4000-8000-000000000002',
    role: 'CLINIC_ADMIN',
  };

  it('updates clinic settings and writes an audit record', async () => {
    const transaction = {
      clinic: {
        update: jest.fn().mockResolvedValue({ id: user.clinicId, name: 'CSK Clinic' }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
    } as unknown as PrismaService;
    const service = new AdministrationService(prisma);

    await expect(service.updateSettings(user, user.clinicId, { name: 'CSK Clinic', currency: 'INR' }))
      .resolves.toMatchObject({ id: user.clinicId });
    expect(transaction.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'CLINIC_SETTINGS_UPDATED',
      }),
    }));
  });

  it('rejects duplicate clinic user emails', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ id: 'existing-user' }),
      },
    } as unknown as PrismaService;
    const service = new AdministrationService(prisma);

    await expect(service.createUser(user, user.clinicId, {
      email: 'staff@example.com',
      password: 'a-long-password',
      role: 'RECEPTIONIST',
    })).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects updates for users outside the clinic', async () => {
    const transaction = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
    } as unknown as PrismaService;
    const service = new AdministrationService(prisma);

    await expect(service.updateUser(user, user.clinicId, 'outside-user', { active: false }))
      .rejects.toBeInstanceOf(NotFoundException);
  });
});
