import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AppointmentSlotStatus,
  AppointmentStatus,
  HeightUnit,
  QueueTokenStatus,
  TemperatureUnit,
  WeightUnit,
} from '@prisma/client';
import { AuthenticatedUser } from '../src/auth/auth.types';
import { CreateCheckInDto } from '../src/appointments/appointment.dto';
import { AppointmentsService } from '../src/appointments/appointments.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { createHmac } from 'crypto';

describe('AppointmentsService patient queue', () => {
  const patientId = '00000000-0000-4000-8000-000000000003';
  const doctorId = '00000000-0000-4000-8000-000000000004';
  const user: AuthenticatedUser = {
    sub: '00000000-0000-4000-8000-000000000001',
    clinicId: '00000000-0000-4000-8000-000000000002',
    role: 'RECEPTIONIST',
  };
  const input: CreateCheckInDto = { patientId, doctorId };

  it('creates a visit and allocates a daily token in the same transaction', async () => {
    const queueEntry = { id: 'queue-1', tokenNumber: 8, encounter: { id: 'visit-1' } };
    const transaction = {
      patient: { findFirst: jest.fn().mockResolvedValue({ id: patientId }) },
      user: { findFirst: jest.fn().mockResolvedValue({ id: doctorId, email: 'doctor@example.test' }) },
      appointment: { findFirst: jest.fn(), updateMany: jest.fn() },
      queueToken: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'queue-1' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(queueEntry),
      },
      queueSequence: { upsert: jest.fn().mockResolvedValue({ lastTokenNumber: 8 }) },
      patientEncounter: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'visit-1' }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
    } as unknown as PrismaService;

    await expect(new AppointmentsService(prisma).checkIn(user, input)).resolves.toEqual(queueEntry);

    expect(transaction.queueSequence.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ clinicId: user.clinicId, doctorId, lastTokenNumber: 1 }),
      update: { lastTokenNumber: { increment: 1 } },
    }));
    expect(transaction.queueToken.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        patientId,
        doctorId,
        tokenNumber: 8,
        patientType: 'NEW',
        status: 'WAITING',
      }),
    }));
    expect(transaction.patientEncounter.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        patientId,
        queueTokenId: 'queue-1',
        encounterType: 'OPD',
      }),
    }));
    expect(transaction.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'PATIENT_CHECKED_IN' }),
    }));
  });

  it('does not allocate another active token for the same patient and doctor', async () => {
    const transaction = {
      patient: { findFirst: jest.fn().mockResolvedValue({ id: patientId }) },
      user: { findFirst: jest.fn().mockResolvedValue({ id: doctorId, email: 'doctor@example.test' }) },
      appointment: { findFirst: jest.fn(), updateMany: jest.fn() },
      queueToken: {
        findFirst: jest.fn().mockResolvedValue({ id: 'queue-existing' }),
        create: jest.fn(),
      },
      queueSequence: { upsert: jest.fn() },
      patientEncounter: { count: jest.fn().mockResolvedValue(0), create: jest.fn() },
      auditLog: { create: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
    } as unknown as PrismaService;

    await expect(new AppointmentsService(prisma).checkIn(user, input))
      .rejects.toBeInstanceOf(ConflictException);
    expect(transaction.queueSequence.upsert).not.toHaveBeenCalled();
    expect(transaction.patientEncounter.create).not.toHaveBeenCalled();
  });

  it('moves a waiting patient to called without changing the visit ID', async () => {
    const queueEntry = { id: 'queue-1', status: QueueTokenStatus.CALLED, encounter: { id: 'visit-1' } };
    const transaction = {
      queueToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(queueEntry),
      },
      appointment: { updateMany: jest.fn() },
      patientEncounter: { updateMany: jest.fn() },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const prisma = {
      queueToken: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'queue-1',
          status: QueueTokenStatus.WAITING,
          appointmentId: null,
        }),
      },
      $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
    } as unknown as PrismaService;

    await expect(new AppointmentsService(prisma).updateQueueStatus(
      { ...user, role: 'NURSE' },
      'queue-1',
      QueueTokenStatus.CALLED,
    )).resolves.toEqual(queueEntry);
    expect(transaction.queueToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: QueueTokenStatus.WAITING }),
      data: { status: QueueTokenStatus.CALLED },
    }));
    expect(transaction.patientEncounter.updateMany).not.toHaveBeenCalled();
  });

  it('checks in a booked appointment exactly once', async () => {
    const appointmentId = '00000000-0000-4000-8000-000000000005';
    const transaction = {
      patient: { findFirst: jest.fn().mockResolvedValue({ id: patientId }) },
      user: { findFirst: jest.fn().mockResolvedValue({ id: doctorId, email: 'doctor@example.test' }) },
      appointment: {
        findFirst: jest.fn().mockResolvedValue({ id: appointmentId, reason: 'Follow-up' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      queueToken: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'queue-1' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'queue-1' }),
      },
      queueSequence: { upsert: jest.fn().mockResolvedValue({ lastTokenNumber: 1 }) },
      patientEncounter: {
        count: jest.fn().mockResolvedValue(2),
        create: jest.fn().mockResolvedValue({ id: 'visit-1' }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
    } as unknown as PrismaService;

    await new AppointmentsService(prisma).checkIn(user, {
      ...input,
      appointmentId,
    });

    expect(transaction.appointment.updateMany).toHaveBeenCalledWith({
      where: { id: appointmentId, clinicId: user.clinicId, status: AppointmentStatus.BOOKED },
      data: { status: AppointmentStatus.CHECKED_IN },
    });
  });

  it('releases a future appointment slot when its queue entry is cancelled', async () => {
    const appointmentId = '00000000-0000-4000-8000-000000000005';
    const slotId = '00000000-0000-4000-8000-000000000006';
    const startsAt = new Date(Date.now() + 60_000);
    const queueEntry = { id: 'queue-1', status: QueueTokenStatus.CANCELLED };
    const transaction = {
      queueToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(queueEntry),
      },
      appointment: {
        findFirst: jest.fn().mockResolvedValue({
          id: appointmentId,
          status: AppointmentStatus.CHECKED_IN,
          slot: { id: slotId, startsAt },
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      appointmentSlot: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      patientEncounter: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const prisma = {
      queueToken: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'queue-1',
          status: QueueTokenStatus.WAITING,
          appointmentId,
        }),
      },
      $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction)),
    } as unknown as PrismaService;

    await expect(new AppointmentsService(prisma).updateQueueStatus(
      { ...user, role: 'RECEPTIONIST' },
      'queue-1',
      QueueTokenStatus.CANCELLED,
    )).resolves.toEqual(queueEntry);

    expect(transaction.appointment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: { in: [AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_PROGRESS] } }),
      data: { status: AppointmentStatus.CANCELLED },
    }));
    expect(transaction.appointmentSlot.updateMany).toHaveBeenCalledWith({
      where: { id: slotId, clinicId: user.clinicId, status: AppointmentSlotStatus.BOOKED },
      data: { status: AppointmentSlotStatus.AVAILABLE },
    });
    expect(transaction.patientEncounter.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ queueTokenId: 'queue-1', status: 'OPEN' }),
      data: { status: 'CLOSED' },
    }));
  });

  it('records consultation timestamps and no-show status transitions', async () => {
      const transaction = {
        queueToken: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'queue-1', status: QueueTokenStatus.NO_SHOW }),
        },
        appointment: { findFirst: jest.fn(), updateMany: jest.fn() },
        patientEncounter: { updateMany: jest.fn() },
        auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
      };
      const prisma = {
        queueToken: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'queue-1',
            status: QueueTokenStatus.WAITING,
            appointmentId: null,
          }),
        },
        $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) =>
          callback(transaction)),
      } as unknown as PrismaService;

      await new AppointmentsService(prisma).updateQueueStatus(
        { ...user, role: 'DOCTOR', sub: doctorId },
        'queue-1',
        QueueTokenStatus.NO_SHOW,
      );

      expect(transaction.queueToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          status: QueueTokenStatus.NO_SHOW,
          noShowAt: expect.any(Date),
        }),
      }));
      expect(transaction.patientEncounter.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        data: { status: 'CLOSED' },
      }));
    });

  it('calculates role-scoped dashboard counts and waiting-time metrics from queue records', async () => {
      const now = Date.now();
      const doctorUser = { ...user, role: 'DOCTOR' as const, sub: doctorId };
      const entry = (
        status: QueueTokenStatus,
        createdOffsetMinutes: number,
        startedOffsetMinutes?: number,
        completedOffsetMinutes?: number,
      ) => ({
        status,
        doctorId,
        createdAt: new Date(now - createdOffsetMinutes * 60_000),
        startedAt: startedOffsetMinutes === undefined ? null : new Date(now - startedOffsetMinutes * 60_000),
        completedAt: completedOffsetMinutes === undefined ? null : new Date(now - completedOffsetMinutes * 60_000),
        patient: { id: patientId, patientCode: 'P-1', fullName: 'Patient One' },
        doctor: { id: doctorId, email: 'doctor@example.test' },
      });
      const todayEntries = [
        entry(QueueTokenStatus.WAITING, 65),
        entry(QueueTokenStatus.CALLED, 20),
        entry(QueueTokenStatus.IN_CONSULTATION, 30, 10),
        entry(QueueTokenStatus.COMPLETED, 60, 55, 40),
        entry(QueueTokenStatus.CANCELLED, 15),
        entry(QueueTokenStatus.NO_SHOW, 10),
      ];
      const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
      const trendGroups = Object.values(QueueTokenStatus).map((status) => ({
        queueDate: today,
        status,
        doctorId,
        _count: { _all: todayEntries.filter((item) => item.status === status).length },
      }));
      const prisma = {
        queueToken: {
          findMany: jest.fn().mockResolvedValue(todayEntries),
          groupBy: jest.fn().mockResolvedValue(trendGroups),
        },
      } as unknown as PrismaService;

      const dashboard = await new AppointmentsService(prisma).getDashboard(doctorUser);

      expect(prisma.queueToken.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ clinicId: user.clinicId, doctorId }),
      }));
      expect(dashboard.counts).toMatchObject({
        assigned: 6,
        waiting: 2,
        inConsultation: 1,
        completed: 1,
        cancelled: 1,
        noShow: 1,
        consultations: 2,
        pending: 3,
      });
      expect(dashboard.waiting).toMatchObject({
        averageMinutes: 28,
        longest: { patientName: 'Patient One', minutes: 65 },
        over15Minutes: 2,
        over30Minutes: 1,
        over60Minutes: 1,
      });
      expect(dashboard.averageConsultationMinutes).toBe(15);
      expect(dashboard).not.toHaveProperty('teamWorkload');
    });

  it('issues a short-lived Realtime token scoped to the signed-in doctor', () => {
      const secret = 'a-test-signing-secret-that-is-never-deployed';
      const values: Record<string, string> = {
        SUPABASE_URL: 'https://clinic.supabase.co',
        SUPABASE_ANON_KEY: 'public-anon-key',
        SUPABASE_JWT_SECRET: secret,
      };
      const config = {
        get: (name: string) => values[name],
      } as unknown as ConfigService;
      const prisma = {} as PrismaService;

      const subscription = new AppointmentsService(prisma, config).getRealtimeSubscription({
        ...user,
        role: 'DOCTOR',
        sub: doctorId,
      });
      const [header, payload, signature] = subscription.token.split('.');
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
      const expectedSignature = createHmac('sha256', secret)
        .update(`${header}.${payload}`)
        .digest('base64url');

      expect(subscription).toMatchObject({ url: values.SUPABASE_URL, anonKey: values.SUPABASE_ANON_KEY });
      expect(claims).toMatchObject({
        role: 'authenticated',
        sub: doctorId,
        clinic_id: user.clinicId,
        doctor_id: doctorId,
      });
      expect(claims.exp - claims.iat).toBe(300);
      expect(signature).toBe(expectedSignature);
    });

  it('rejects Realtime credentials for non-doctor users', () => {
    const service = new AppointmentsService({} as PrismaService);
    expect(() => service.getRealtimeSubscription(user)).toThrow(ForbiddenException);
  });

  it('saves front-office vitals and assignment details with the new visit', async () => {
      const transaction = {
        patient: { findFirst: jest.fn().mockResolvedValue({ id: patientId }) },
        user: { findFirst: jest.fn().mockResolvedValue({ id: doctorId, email: 'doctor@example.test' }) },
        appointment: { findFirst: jest.fn(), updateMany: jest.fn() },
        queueToken: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'queue-1' }),
          findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'queue-1' }),
        },
        queueSequence: { upsert: jest.fn().mockResolvedValue({ lastTokenNumber: 1 }) },
        patientEncounter: {
          count: jest.fn().mockResolvedValue(1),
          create: jest.fn().mockResolvedValue({ id: 'visit-1' }),
        },
        patientVitals: { create: jest.fn().mockResolvedValue({ id: 'vitals-1' }) },
        auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
      };
      const prisma = {
        $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
      } as unknown as PrismaService;

      await new AppointmentsService(prisma).checkIn(user, {
        ...input,
        department: 'General medicine',
        priority: 'URGENT',
        vitals: {
          respiratoryRateBpm: 18,
          temperatureValue: 98.6,
          temperatureUnit: TemperatureUnit.FAHRENHEIT,
          heightUnit: HeightUnit.FEET_INCHES,
          heightFeet: 5,
          heightInches: 7,
          weightUnit: WeightUnit.POUNDS,
          weightValue: 150,
        },
      });

      expect(transaction.queueToken.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          priority: 'URGENT',
          patientType: 'EXISTING',
          department: 'General medicine',
        }),
      }));
      expect(transaction.patientVitals.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          encounterId: 'visit-1',
          recordedById: user.sub,
          respiratoryRateBpm: 18,
          temperatureC: 37,
          heightCm: 170.18,
          heightEnteredValue: '5 ft 7 in',
          weightKg: 68.04,
          weightEnteredValue: 150,
        }),
      }));
    });
});
