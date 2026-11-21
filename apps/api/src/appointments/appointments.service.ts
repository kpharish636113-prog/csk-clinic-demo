import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  AppointmentSlotStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { writeAuditLog } from '../audit/audit-log.utils';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAppointmentDto,
  CreateSlotDto,
  ListAppointmentsQueryDto,
  ListSlotsQueryDto,
} from './appointment.dto';

const APPOINTMENT_INCLUDE = {
  patient: { select: { id: true, patientCode: true, fullName: true, mobile: true } },
  doctor: { select: { id: true, email: true } },
  slot: { select: { id: true, startsAt: true, endsAt: true } },
} satisfies Prisma.AppointmentInclude;

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
  CHECKED_IN: [AppointmentStatus.IN_PROGRESS, AppointmentStatus.CANCELLED],
  IN_PROGRESS: [AppointmentStatus.COMPLETED],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
