import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AppointmentStatus,
  AppointmentSlotStatus,
  EncounterType,
  PatientVisitType,
  Prisma,
  QueueTokenPriority,
  QueueTokenStatus,
  UserRole,
} from '@prisma/client';
import { createHmac } from 'crypto';
import { AuthenticatedUser } from '../auth/auth.types';
import { writeAuditLog } from '../audit/audit-log.utils';
import { PrismaService } from '../prisma/prisma.service';
import { normalizePatientVitals } from '../patients/patient-vitals.utils';
import {
  CreateCheckInDto,
  CreateAppointmentDto,
  CreateSlotDto,
  ListQueueQueryDto,
  ListAppointmentsQueryDto,
  ListSlotsQueryDto,
} from './appointment.dto';

const APPOINTMENT_INCLUDE = {
  patient: { select: { id: true, patientCode: true, fullName: true, mobile: true } },
  doctor: { select: { id: true, email: true } },
  slot: { select: { id: true, startsAt: true, endsAt: true } },
  queueToken: { select: { id: true, tokenNumber: true, status: true } },
} satisfies Prisma.AppointmentInclude;

const QUEUE_INCLUDE = {
  patient: {
    select: {
      id: true,
      patientCode: true,
      fullName: true,
      mobile: true,
      dateOfBirth: true,
      gender: true,
      createdAt: true,
      registeredBy: { select: { id: true, email: true, role: true } },
    },
  },
  doctor: { select: { id: true, email: true } },
  createdBy: { select: { id: true, email: true, role: true } },
  encounter: {
    select: { id: true, encounterType: true, status: true, visitDate: true },
  },
  appointment: { select: { id: true, status: true, slot: { select: { startsAt: true } } } },
} satisfies Prisma.QueueTokenInclude;

const NURSE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.IN_PROGRESS,
];
const DOCTOR_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.IN_PROGRESS,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
];
const RECEPTIONIST_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.CANCELLED,
  AppointmentStatus.NO_SHOW,
];

const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  BOOKED: [AppointmentStatus.CHECKED_IN, AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
  CHECKED_IN: [
    AppointmentStatus.IN_PROGRESS,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
  ],
  IN_PROGRESS: [AppointmentStatus.COMPLETED],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

const QUEUE_TRANSITIONS: Record<QueueTokenStatus, QueueTokenStatus[]> = {
  WAITING: [QueueTokenStatus.CALLED, QueueTokenStatus.CANCELLED, QueueTokenStatus.NO_SHOW],
  CALLED: [
    QueueTokenStatus.WAITING,
    QueueTokenStatus.IN_CONSULTATION,
    QueueTokenStatus.CANCELLED,
    QueueTokenStatus.NO_SHOW,
  ],
  IN_CONSULTATION: [QueueTokenStatus.COMPLETED],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config?: ConfigService,
  ) {}

  listDoctors(clinicId: string) {
    return this.prisma.user.findMany({
      where: { clinicId, role: UserRole.DOCTOR, active: true },
      orderBy: { email: 'asc' },
      select: { id: true, email: true },
    });
  }

  async listSlots(clinicId: string, query: ListSlotsQueryDto) {
    const from = new Date(query.from);
    const to = new Date(query.to);
    const range = to.getTime() - from.getTime();
    if (range <= 0 || range > 31 * 24 * 60 * 60 * 1000) {
      throw new BadRequestException('The slot search range must be positive and no longer than 31 days.');
    }

    return this.prisma.appointmentSlot.findMany({
      where: {
        clinicId,
        doctorId: query.doctorId,
        status: AppointmentSlotStatus.AVAILABLE,
        startsAt: { gte: from > new Date() ? from : new Date(), lt: to },
      },
      orderBy: { startsAt: 'asc' },
      take: 500,
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        doctor: { select: { id: true, email: true } },
      },
    });
  }

  async createSlot(user: AuthenticatedUser, input: CreateSlotDto) {
    if (user.role === UserRole.DOCTOR && user.sub !== input.doctorId) {
      throw new ForbiddenException('Doctors can only create their own availability.');
    }

    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    const duration = endsAt.getTime() - startsAt.getTime();
    const now = new Date();
    if (startsAt <= now || duration <= 0 || duration > 8 * 60 * 60 * 1000) {
      throw new BadRequestException('A slot must be in the future and last no longer than 8 hours.');
    }

    const doctor = await this.prisma.user.findFirst({
      where: { id: input.doctorId, clinicId: user.clinicId, role: UserRole.DOCTOR, active: true },
      select: { id: true },
    });
    if (!doctor) {
      throw new NotFoundException('Active doctor not found in this clinic.');
    }

    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          const overlaps = await transaction.appointmentSlot.count({
            where: {
              doctorId: doctor.id,
              startsAt: { lt: endsAt },
              endsAt: { gt: startsAt },
            },
          });
          if (overlaps > 0) {
            throw new ConflictException('This time overlaps an existing doctor slot.');
          }

          const slot = await transaction.appointmentSlot.create({
            data: {
              clinicId: user.clinicId,
              doctorId: doctor.id,
              startsAt,
              endsAt,
            },
            select: { id: true, doctorId: true, startsAt: true, endsAt: true, status: true },
          });
          await writeAuditLog(transaction, {
            clinicId: user.clinicId,
            userId: user.sub,
            action: 'APPOINTMENT_SLOT_CREATED',
            resource: 'appointment_slot',
            resourceId: slot.id,
            metadata: { doctorId: slot.doctorId },
          });
          return slot;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2034') {
          throw new ConflictException('Availability changed while creating the slot. Please retry.');
        }
        if (error.code === 'P2002') {
          throw new ConflictException('A slot already exists for this doctor at that start time.');
        }
      }
      throw error;
    }
  }

  async listAppointments(user: AuthenticatedUser, query: ListAppointmentsQueryDto) {
    if (query.page < 1 || query.limit < 1 || query.limit > 100) {
      throw new BadRequestException('Page must be positive and limit must be between 1 and 100.');
    }

    const where: Prisma.AppointmentWhereInput = {
      clinicId: user.clinicId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(user.role === UserRole.DOCTOR
        ? { doctorId: user.sub }
        : query.doctorId
          ? { doctorId: query.doctorId }
          : {}),
    };
    return this.prisma.$transaction(async (transaction) => {
      const [items, total] = await Promise.all([
        transaction.appointment.findMany({
          where,
          include: APPOINTMENT_INCLUDE,
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        transaction.appointment.count({ where }),
      ]);
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'APPOINTMENT_LIST_VIEWED',
        resource: 'appointment',
        metadata: { page: query.page, resultCount: items.length },
      });

      return {
        items,
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      };
    });
  }

  async listQueue(user: AuthenticatedUser, query: ListQueueQueryDto) {
    const queueDate = this.resolveQueueDate(query.date);
    return this.prisma.$transaction(async (transaction) => {
      const where: Prisma.QueueTokenWhereInput = {
        clinicId: user.clinicId,
        queueDate,
        ...(user.role === UserRole.DOCTOR
          ? { doctorId: user.sub }
          : query.doctorId
            ? { doctorId: query.doctorId }
            : {}),
      };
      const items = await transaction.queueToken.findMany({
        where,
        include: QUEUE_INCLUDE,
        orderBy: [{ priority: 'desc' }, { tokenNumber: 'asc' }],
        take: 200,
      });
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'PATIENT_QUEUE_VIEWED',
        resource: 'queue',
        metadata: { queueDate: queueDate.toISOString().slice(0, 10), resultCount: items.length },
      });
      return items;
    });
  }

  async getDashboard(user: AuthenticatedUser) {
    const today = this.currentQueueDate();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const sixMonthsAgo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));
    const doctorScope = user.role === UserRole.DOCTOR ? { doctorId: user.sub } : {};
    const todayWhere: Prisma.QueueTokenWhereInput = {
      clinicId: user.clinicId,
      queueDate: today,
      ...doctorScope,
    };
    const trendWhere: Prisma.QueueTokenWhereInput = {
      clinicId: user.clinicId,
      queueDate: { gte: sixMonthsAgo, lt: tomorrow },
      ...doctorScope,
    };
    const [todayEntries, trendGroups] = await Promise.all([
      this.prisma.queueToken.findMany({
        where: todayWhere,
        select: {
          status: true,
          doctorId: true,
          createdAt: true,
          startedAt: true,
          completedAt: true,
          patient: { select: { id: true, patientCode: true, fullName: true } },
          doctor: { select: { id: true, email: true } },
        },
      }),
      this.prisma.queueToken.groupBy({
        by: ['queueDate', 'status', 'doctorId'],
        where: trendWhere,
        _count: { _all: true },
      }),
    ]);

    const waitingEntries = todayEntries.filter(({ status }) =>
      status === QueueTokenStatus.WAITING || status === QueueTokenStatus.CALLED);
    const inConsultation = todayEntries.filter(
      ({ status }) => status === QueueTokenStatus.IN_CONSULTATION,
    ).length;
    const completed = todayEntries.filter(
      ({ status }) => status === QueueTokenStatus.COMPLETED,
    ).length;
    const now = Date.now();
    const average = (values: number[]) =>
      values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
    const activeWaitingStatuses: QueueTokenStatus[] = [
      QueueTokenStatus.WAITING,
      QueueTokenStatus.CALLED,
    ];
    const waitMinutes = todayEntries
      .filter((entry) => activeWaitingStatuses.includes(entry.status) || entry.startedAt)
      .map((entry) => Math.max(
        0,
        ((entry.startedAt?.getTime() ?? now) - entry.createdAt.getTime()) / 60000,
      ));
    const consultationMinutes = todayEntries
      .filter((entry) => entry.startedAt && entry.completedAt)
      .map((entry) => Math.max(0, (entry.completedAt!.getTime() - entry.startedAt!.getTime()) / 60000));
    const oldestWaiting = [...waitingEntries].sort(
      (left, right) => left.createdAt.getTime() - right.createdAt.getTime(),
    )[0];
    const statuses = Object.values(QueueTokenStatus);
    const getCount = (date: Date, status: QueueTokenStatus) =>
      trendGroups
        .filter((group) => group.queueDate.getTime() === date.getTime() && group.status === status)
        .reduce((sum, group) => sum + group._count._all, 0);
    const countForDate = (date: Date) => ({
      assigned: trendGroups
        .filter((group) => group.queueDate.getTime() === date.getTime())
        .reduce((sum, group) => sum + group._count._all, 0),
      completed: getCount(date, QueueTokenStatus.COMPLETED),
    });
    const startOfWeek = (date: Date) => {
      const start = new Date(date);
      start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
      return start;
    };
    const currentWeek = startOfWeek(today);
    const dailyStats = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today.getTime() - (6 - index) * 24 * 60 * 60 * 1000);
      return { date: date.toISOString().slice(0, 10), ...countForDate(date) };
    });
    const weeklyStats = Array.from({ length: 4 }, (_, index) => {
      const start = new Date(currentWeek.getTime() - (3 - index) * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      const groups = trendGroups.filter(
        (group) => group.queueDate >= start && group.queueDate < end,
      );
      return {
        week: start.toISOString().slice(0, 10),
        assigned: groups.reduce((sum, group) => sum + group._count._all, 0),
        completed: groups
          .filter((group) => group.status === QueueTokenStatus.COMPLETED)
          .reduce((sum, group) => sum + group._count._all, 0),
      };
    });
    const monthlyStats = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5 + index, 1));
      const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
      const groups = trendGroups.filter(
        (group) => group.queueDate >= date && group.queueDate < next,
      );
      return {
        month: date.toISOString().slice(0, 7),
        assigned: groups.reduce((sum, group) => sum + group._count._all, 0),
        completed: groups
          .filter((group) => group.status === QueueTokenStatus.COMPLETED)
          .reduce((sum, group) => sum + group._count._all, 0),
      };
    });
    const hourlyArrivals = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: todayEntries.filter((entry) => entry.createdAt.getUTCHours() === hour).length,
    }));
    const managerRoles: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.CLINIC_OWNER,
      UserRole.CLINIC_ADMIN,
    ];
    const teamWorkload = managerRoles.includes(user.role)
      ? Array.from(
          todayEntries.reduce((doctors, entry) => {
            const current = doctors.get(entry.doctorId) || {
              doctorId: entry.doctorId,
              doctorName: entry.doctor.email,
              assigned: 0,
              waiting: 0,
              inConsultation: 0,
              completed: 0,
              durations: [] as number[],
            };
            current.assigned += 1;
            if (
              entry.status === QueueTokenStatus.WAITING ||
              entry.status === QueueTokenStatus.CALLED
            ) {
              current.waiting += 1;
            } else if (entry.status === QueueTokenStatus.IN_CONSULTATION) {
              current.inConsultation += 1;
            } else if (entry.status === QueueTokenStatus.COMPLETED) {
              current.completed += 1;
            }
            if (entry.startedAt && entry.completedAt) {
              current.durations.push(
                (entry.completedAt.getTime() - entry.startedAt.getTime()) / 60000,
              );
            }
            doctors.set(entry.doctorId, current);
            return doctors;
          }, new Map<string, {
            doctorId: string;
            doctorName: string;
            assigned: number;
            waiting: number;
            inConsultation: number;
            completed: number;
            durations: number[];
          }>())
            .values(),
        ).map(({ durations, ...doctor }) => ({
          ...doctor,
          averageConsultationMinutes: average(durations),
        }))
      : undefined;

    return {
      date: today.toISOString().slice(0, 10),
      counts: {
        assigned: todayEntries.length,
        waiting: waitingEntries.length,
        inConsultation,
        completed,
        cancelled: todayEntries.filter(({ status }) => status === QueueTokenStatus.CANCELLED).length,
        noShow: todayEntries.filter(({ status }) => status === QueueTokenStatus.NO_SHOW).length,
        consultations: inConsultation + completed,
        pending: waitingEntries.length + inConsultation,
      },
      waiting: {
        averageMinutes: average(waitMinutes),
        longest: oldestWaiting
          ? {
              patientId: oldestWaiting.patient.id,
              patientName: oldestWaiting.patient.fullName,
              patientCode: oldestWaiting.patient.patientCode,
              minutes: Math.floor((now - oldestWaiting.createdAt.getTime()) / 60000),
            }
          : null,
        over15Minutes: waitingEntries.filter(
          (entry) => now - entry.createdAt.getTime() >= 15 * 60000,
        ).length,
        over30Minutes: waitingEntries.filter(
          (entry) => now - entry.createdAt.getTime() >= 30 * 60000,
        ).length,
        over60Minutes: waitingEntries.filter(
          (entry) => now - entry.createdAt.getTime() >= 60 * 60000,
        ).length,
      },
      averageConsultationMinutes: average(consultationMinutes),
      hourlyArrivals,
      dailyStats,
      weeklyStats,
      monthlyStats,
      ...(teamWorkload ? { teamWorkload } : {}),
      statusDistribution: statuses.map((status) => ({
        status,
        count: todayEntries.filter((entry) => entry.status === status).length,
      })),
    };
  }

  getRealtimeSubscription(user: AuthenticatedUser) {
    if (user.role !== UserRole.DOCTOR) {
      throw new ForbiddenException('Only doctors can subscribe to their patient queue.');
    }
    const url = this.config?.get<string>('SUPABASE_URL');
    const anonKey = this.config?.get<string>('SUPABASE_ANON_KEY');
    const secret = this.config?.get<string>('SUPABASE_JWT_SECRET');
    if (!url || !anonKey || !secret) {
      throw new ServiceUnavailableException('Doctor queue Realtime is not configured.');
    }

    const issuedAt = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      aud: 'authenticated',
      role: 'authenticated',
      sub: user.sub,
      clinic_id: user.clinicId,
      doctor_id: user.sub,
      iat: issuedAt,
      exp: issuedAt + 300,
    })).toString('base64url');
    const unsignedToken = `${header}.${payload}`;
    const signature = createHmac('sha256', secret).update(unsignedToken).digest('base64url');

    return { url, anonKey, token: `${unsignedToken}.${signature}` };
  }

  async checkIn(user: AuthenticatedUser, input: CreateCheckInDto) {
    if (user.role === UserRole.DOCTOR && user.sub !== input.doctorId) {
      throw new ForbiddenException('Doctors can only check in patients to their own queue.');
    }
    const vitalsData = input.vitals ? normalizePatientVitals(input.vitals) : null;

    try {
      return await this.prisma.$transaction(
        async (transaction) => {
          const patient = await transaction.patient.findFirst({
            where: { id: input.patientId, clinicId: user.clinicId, status: 'ACTIVE' },
            select: { id: true },
          });
          if (!patient) throw new NotFoundException('Active patient not found in this clinic.');
          const priorEncounterCount = await transaction.patientEncounter.count({
            where: { clinicId: user.clinicId, patientId: patient.id },
          });

          const doctor = await transaction.user.findFirst({
            where: {
              id: input.doctorId,
              clinicId: user.clinicId,
              role: UserRole.DOCTOR,
              active: true,
            },
            select: { id: true, email: true },
          });
          if (!doctor) throw new NotFoundException('Active doctor not found in this clinic.');

          let appointmentReason = '';
          if (input.appointmentId) {
            const appointment = await transaction.appointment.findFirst({
              where: {
                id: input.appointmentId,
                clinicId: user.clinicId,
                patientId: patient.id,
                doctorId: doctor.id,
                status: AppointmentStatus.BOOKED,
              },
              select: { id: true, reason: true },
            });
            if (!appointment) {
              throw new ConflictException('This appointment is no longer available for check-in.');
            }
            appointmentReason = appointment.reason || '';
          }

          const queueDate = this.currentQueueDate();
          const activeQueueEntry = await transaction.queueToken.findFirst({
            where: {
              clinicId: user.clinicId,
              patientId: patient.id,
              doctorId: doctor.id,
              queueDate,
              status: {
                in: [
                  QueueTokenStatus.WAITING,
                  QueueTokenStatus.CALLED,
                  QueueTokenStatus.IN_CONSULTATION,
                ],
              },
            },
            select: { id: true },
          });
          if (activeQueueEntry) {
            throw new ConflictException('This patient already has an active queue entry for this doctor today.');
          }

          if (input.appointmentId) {
            const checkedIn = await transaction.appointment.updateMany({
              where: {
                id: input.appointmentId,
                clinicId: user.clinicId,
                status: AppointmentStatus.BOOKED,
              },
              data: { status: AppointmentStatus.CHECKED_IN },
            });
            if (checkedIn.count !== 1) {
              throw new ConflictException('Appointment status changed while checking in. Refresh and retry.');
            }
          }

          const sequence = await transaction.queueSequence.upsert({
            where: {
              clinicId_doctorId_queueDate: {
                clinicId: user.clinicId,
                doctorId: doctor.id,
                queueDate,
              },
            },
            create: {
              clinicId: user.clinicId,
              doctorId: doctor.id,
              queueDate,
              lastTokenNumber: 1,
            },
            update: { lastTokenNumber: { increment: 1 } },
            select: { lastTokenNumber: true },
          });
          const queueToken = await transaction.queueToken.create({
            data: {
              clinicId: user.clinicId,
              patientId: patient.id,
              doctorId: doctor.id,
              createdById: user.sub,
              ...(input.appointmentId ? { appointmentId: input.appointmentId } : {}),
              queueDate,
              tokenNumber: sequence.lastTokenNumber,
              priority: input.priority ?? QueueTokenPriority.NORMAL,
              patientType: priorEncounterCount === 0 ? PatientVisitType.NEW : PatientVisitType.EXISTING,
              department: input.department?.trim() || null,
              status: QueueTokenStatus.WAITING,
              reason: input.reason?.trim() || appointmentReason || null,
            },
            select: { id: true },
          });
          const encounter = await transaction.patientEncounter.create({
            data: {
              clinicId: user.clinicId,
              patientId: patient.id,
              createdById: user.sub,
              queueTokenId: queueToken.id,
              encounterType: input.encounterType ?? EncounterType.OPD,
              visitDate: queueDate,
              doctorName: doctor.email,
            },
            select: { id: true },
          });
          if (vitalsData) {
            const vitalRecord = await transaction.patientVitals.create({
              data: {
                clinicId: user.clinicId,
                patientId: patient.id,
                encounterId: encounter.id,
                recordedById: user.sub,
                ...vitalsData,
              },
              select: { id: true },
            });
            await writeAuditLog(transaction, {
              clinicId: user.clinicId,
              userId: user.sub,
              action: 'PATIENT_VITALS_RECORDED',
              resource: 'patient_vitals',
              resourceId: vitalRecord.id,
              metadata: { patientId: patient.id, encounterId: encounter.id },
            });
          }

          await writeAuditLog(transaction, {
            clinicId: user.clinicId,
            userId: user.sub,
            action: 'PATIENT_CHECKED_IN',
            resource: 'patient_encounter',
            resourceId: encounter.id,
            metadata: {
              patientId: patient.id,
              doctorId: doctor.id,
              queueTokenId: queueToken.id,
              appointmentId: input.appointmentId || null,
              encounterType: input.encounterType ?? EncounterType.OPD,
              patientType: priorEncounterCount === 0 ? PatientVisitType.NEW : PatientVisitType.EXISTING,
              department: input.department?.trim() || null,
              vitalsRecorded: Boolean(vitalsData),
            },
          });
          await writeAuditLog(transaction, {
            clinicId: user.clinicId,
            userId: user.sub,
            action: 'QUEUE_TOKEN_CREATED',
            resource: 'queue_token',
            resourceId: queueToken.id,
            metadata: { patientId: patient.id, doctorId: doctor.id, tokenNumber: sequence.lastTokenNumber },
          });

          return transaction.queueToken.findUniqueOrThrow({
            where: { id: queueToken.id },
            include: QUEUE_INCLUDE,
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002' || error.code === 'P2034') {
          throw new ConflictException('Queue changed while checking in. Refresh and retry.');
        }
      }
      throw error;
    }
  }

  async updateQueueStatus(
    user: AuthenticatedUser,
    queueTokenId: string,
    status: QueueTokenStatus,
  ) {
    const queueToken = await this.prisma.queueToken.findFirst({
      where: {
        id: queueTokenId,
        clinicId: user.clinicId,
        ...(user.role === UserRole.DOCTOR ? { doctorId: user.sub } : {}),
      },
      select: { id: true, status: true, appointmentId: true },
    });
    if (!queueToken) throw new NotFoundException('Queue entry not found.');

    if (
      user.role === UserRole.RECEPTIONIST &&
      status !== QueueTokenStatus.CANCELLED &&
      status !== QueueTokenStatus.NO_SHOW
    ) {
      throw new ForbiddenException('Receptionists can only cancel or mark a queue entry as no-show.');
    }
    const nurseQueueStatuses: QueueTokenStatus[] = [
      QueueTokenStatus.CALLED,
      QueueTokenStatus.WAITING,
      QueueTokenStatus.CANCELLED,
      QueueTokenStatus.NO_SHOW,
    ];
    const doctorQueueStatuses: QueueTokenStatus[] = [
      QueueTokenStatus.CALLED,
      QueueTokenStatus.IN_CONSULTATION,
      QueueTokenStatus.COMPLETED,
      QueueTokenStatus.NO_SHOW,
    ];
    if (user.role === UserRole.NURSE && !nurseQueueStatuses.includes(status)) {
      throw new ForbiddenException('Nursing staff can call, return, or cancel a queue entry.');
    }
    if (user.role === UserRole.DOCTOR && !doctorQueueStatuses.includes(status)) {
      throw new ForbiddenException('Doctors can call, start, or complete their queue entries.');
    }
    if (!QUEUE_TRANSITIONS[queueToken.status].includes(status)) {
      throw new ConflictException(
        `Cannot change queue entry from ${queueToken.status} to ${status}.`,
      );
    }

    return this.prisma.$transaction(
      async (transaction) => {
        const changed = await transaction.queueToken.updateMany({
          where: {
            id: queueToken.id,
            clinicId: user.clinicId,
            status: queueToken.status,
          },
          data: {
            status,
            ...(status === QueueTokenStatus.IN_CONSULTATION ? { startedAt: new Date() } : {}),
            ...(status === QueueTokenStatus.COMPLETED ? { completedAt: new Date() } : {}),
            ...(status === QueueTokenStatus.CANCELLED ? { cancelledAt: new Date() } : {}),
            ...(status === QueueTokenStatus.NO_SHOW ? { noShowAt: new Date() } : {}),
          },
        });
        if (changed.count !== 1) {
          throw new ConflictException('Queue entry changed concurrently. Refresh and retry.');
        }

        if (queueToken.appointmentId) {
          const appointment = await transaction.appointment.findFirst({
            where: { id: queueToken.appointmentId, clinicId: user.clinicId },
            select: { id: true, status: true, slot: { select: { id: true, startsAt: true } } },
          });
          if (!appointment) {
            throw new ConflictException('The appointment linked to this queue entry no longer exists.');
          }

          const appointmentStatus = status === QueueTokenStatus.IN_CONSULTATION
            ? AppointmentStatus.IN_PROGRESS
            : status === QueueTokenStatus.COMPLETED
              ? AppointmentStatus.COMPLETED
              : status === QueueTokenStatus.CANCELLED
                ? AppointmentStatus.CANCELLED
                : status === QueueTokenStatus.NO_SHOW
                  ? AppointmentStatus.NO_SHOW
                  : null;
          if (appointmentStatus) {
            const changedAppointment = await transaction.appointment.updateMany({
              where: {
                id: queueToken.appointmentId,
                clinicId: user.clinicId,
                status: {
                  in: [
                    AppointmentStatus.CHECKED_IN,
                    AppointmentStatus.IN_PROGRESS,
                  ],
                },
              },
              data: { status: appointmentStatus },
            });
            if (changedAppointment.count !== 1) {
              throw new ConflictException('Appointment status changed concurrently. Refresh and retry.');
            }

            if (
              appointmentStatus === AppointmentStatus.CANCELLED &&
              appointment.slot.startsAt > new Date()
            ) {
              const released = await transaction.appointmentSlot.updateMany({
                where: {
                  id: appointment.slot.id,
                  clinicId: user.clinicId,
                  status: AppointmentSlotStatus.BOOKED,
                },
                data: { status: AppointmentSlotStatus.AVAILABLE },
              });
              if (released.count !== 1) {
                throw new ConflictException('Could not release the appointment slot; refresh and retry.');
              }
            }
          }
        }

        if (
          status === QueueTokenStatus.COMPLETED ||
          status === QueueTokenStatus.CANCELLED ||
          status === QueueTokenStatus.NO_SHOW
        ) {
          await transaction.patientEncounter.updateMany({
            where: {
              clinicId: user.clinicId,
              queueTokenId: queueToken.id,
              status: 'OPEN',
            },
            data: { status: 'CLOSED' },
          });
        }

        await writeAuditLog(transaction, {
          clinicId: user.clinicId,
          userId: user.sub,
          action: 'QUEUE_STATUS_CHANGED',
          resource: 'queue_token',
          resourceId: queueToken.id,
          metadata: { from: queueToken.status, to: status },
        });
        return transaction.queueToken.findUniqueOrThrow({
          where: { id: queueToken.id },
          include: QUEUE_INCLUDE,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async createAppointment(user: AuthenticatedUser, input: CreateAppointmentDto) {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const patient = await transaction.patient.findFirst({
          where: { id: input.patientId, clinicId: user.clinicId, status: 'ACTIVE' },
          select: { id: true },
        });
        if (!patient) {
          throw new NotFoundException('Active patient not found in this clinic.');
        }

        const slot = await transaction.appointmentSlot.findFirst({
          where: {
            id: input.slotId,
            clinicId: user.clinicId,
            status: AppointmentSlotStatus.AVAILABLE,
            startsAt: { gt: new Date() },
          },
          select: { id: true, doctorId: true },
        });
        if (!slot) {
          throw new ConflictException('This appointment slot is unavailable.');
        }

        const reserved = await transaction.appointmentSlot.updateMany({
          where: {
            id: slot.id,
            clinicId: user.clinicId,
            status: AppointmentSlotStatus.AVAILABLE,
          },
          data: { status: AppointmentSlotStatus.BOOKED },
        });
        if (reserved.count !== 1) {
          throw new ConflictException('This appointment slot has just been booked.');
        }

        const appointment = await transaction.appointment.create({
          data: {
            clinicId: user.clinicId,
            patientId: patient.id,
            doctorId: slot.doctorId,
            slotId: slot.id,
            reason: input.reason?.trim() || null,
          },
          include: APPOINTMENT_INCLUDE,
        });
        await writeAuditLog(transaction, {
          clinicId: user.clinicId,
          userId: user.sub,
          action: 'APPOINTMENT_CREATED',
          resource: 'appointment',
          resourceId: appointment.id,
          metadata: { doctorId: slot.doctorId, slotId: slot.id },
        });
        return appointment;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This appointment slot has just been booked.');
      }
      throw error;
    }
  }

  async updateStatus(user: AuthenticatedUser, appointmentId: string, status: AppointmentStatus) {
    const where: Prisma.AppointmentWhereInput = {
      id: appointmentId,
      clinicId: user.clinicId,
      ...(user.role === UserRole.DOCTOR ? { doctorId: user.sub } : {}),
    };
    const appointment = await this.prisma.appointment.findFirst({
      where,
      include: { slot: { select: { id: true, startsAt: true } } },
    });
    if (!appointment) {
      throw new NotFoundException('Appointment not found.');
    }

    if (
      user.role === UserRole.NURSE &&
      !NURSE_STATUSES.includes(status)
    ) {
      throw new ForbiddenException('Nurses can only check in patients or mark a consultation in progress.');
    }
    if (
      user.role === UserRole.DOCTOR &&
      !DOCTOR_STATUSES.includes(status)
    ) {
      throw new ForbiddenException('Doctors cannot perform this appointment status change.');
    }
    if (
      user.role === UserRole.RECEPTIONIST &&
      !RECEPTIONIST_STATUSES.includes(status)
    ) {
      throw new ForbiddenException('Receptionists cannot perform this appointment status change.');
    }
    if (!ALLOWED_TRANSITIONS[appointment.status].includes(status)) {
      throw new ConflictException(
        `Cannot change appointment from ${appointment.status} to ${status}.`,
      );
    }

    if (status === AppointmentStatus.CHECKED_IN) {
      return this.checkIn(user, {
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        appointmentId: appointment.id,
        encounterType: EncounterType.OPD,
        priority: QueueTokenPriority.NORMAL,
        reason: appointment.reason || undefined,
      });
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const changed = await transaction.appointment.updateMany({
          where: { id: appointment.id, clinicId: user.clinicId, status: appointment.status },
          data: { status },
        });
        if (changed.count !== 1) {
          throw new ConflictException('Appointment status changed concurrently. Please refresh.');
        }

        if (status === AppointmentStatus.CANCELLED && appointment.slot.startsAt > new Date()) {
          const released = await transaction.appointmentSlot.updateMany({
            where: {
              id: appointment.slot.id,
              clinicId: user.clinicId,
              status: AppointmentSlotStatus.BOOKED,
            },
            data: { status: AppointmentSlotStatus.AVAILABLE },
          });
          if (released.count !== 1) {
            throw new ConflictException('Could not release the appointment slot; refresh and retry.');
          }
        }

        const queueStatus = status === AppointmentStatus.IN_PROGRESS
          ? QueueTokenStatus.IN_CONSULTATION
          : status === AppointmentStatus.COMPLETED
            ? QueueTokenStatus.COMPLETED
            : status === AppointmentStatus.CANCELLED
              ? QueueTokenStatus.CANCELLED
              : status === AppointmentStatus.NO_SHOW
                ? QueueTokenStatus.NO_SHOW
              : null;
        if (queueStatus) {
          const queueToken = await transaction.queueToken.findFirst({
            where: { clinicId: user.clinicId, appointmentId: appointment.id },
            select: { id: true },
          });
          if (queueToken) {
            await transaction.queueToken.updateMany({
              where: { id: queueToken.id, clinicId: user.clinicId },
              data: {
                status: queueStatus,
                ...(queueStatus === QueueTokenStatus.IN_CONSULTATION
                  ? { startedAt: new Date() }
                  : {}),
                ...(queueStatus === QueueTokenStatus.COMPLETED
                  ? { completedAt: new Date() }
                  : {}),
                ...(queueStatus === QueueTokenStatus.CANCELLED
                  ? { cancelledAt: new Date() }
                  : {}),
                ...(queueStatus === QueueTokenStatus.NO_SHOW ? { noShowAt: new Date() } : {}),
              },
            });
            if (
              queueStatus === QueueTokenStatus.COMPLETED ||
              queueStatus === QueueTokenStatus.CANCELLED ||
              queueStatus === QueueTokenStatus.NO_SHOW
            ) {
              await transaction.patientEncounter.updateMany({
                where: {
                  clinicId: user.clinicId,
                  queueTokenId: queueToken.id,
                  status: 'OPEN',
                },
                data: { status: 'CLOSED' },
              });
            }
          }
        }

        const updatedAppointment = await transaction.appointment.findUniqueOrThrow({
          where: { id: appointment.id },
          include: APPOINTMENT_INCLUDE,
        });
        await writeAuditLog(transaction, {
          clinicId: user.clinicId,
          userId: user.sub,
          action: 'APPOINTMENT_STATUS_CHANGED',
          resource: 'appointment',
          resourceId: appointment.id,
          metadata: { from: appointment.status, to: status },
        });
        return updatedAppointment;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Appointment not found.');
      }
      throw error;
    }
  }

  private currentQueueDate() {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  private resolveQueueDate(value?: string) {
    if (!value) return this.currentQueueDate();
    const datePart = value.slice(0, 10);
    const queueDate = new Date(`${datePart}T00:00:00.000Z`);
    if (!Number.isFinite(queueDate.getTime()) || queueDate.toISOString().slice(0, 10) !== datePart) {
      throw new BadRequestException('Queue date must be a valid calendar date.');
    }
    return queueDate;
  }
}
