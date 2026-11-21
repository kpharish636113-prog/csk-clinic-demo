import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { AuthenticatedUser } from '../auth/auth.types';
import { writeAuditLog } from '../audit/audit-log.utils';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClinicUserDto, UpdateClinicSettingsDto, UpdateClinicUserDto } from './administration.dto';

@Injectable()
export class AdministrationService {
  constructor(private readonly prisma: PrismaService) {}

  getSettings(clinicId: string) {
    return this.prisma.clinic.findUniqueOrThrow({ where: { id: clinicId } });
  }

  async updateSettings(user: AuthenticatedUser, clinicId: string, input: UpdateClinicSettingsDto) {
    return this.prisma.$transaction(async (transaction) => {
      const clinic = await transaction.clinic.update({
        where: { id: clinicId },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.phone !== undefined ? { phone: input.phone.trim() || null } : {}),
          ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() || null } : {}),
          ...(input.address !== undefined ? { address: input.address.trim() || null } : {}),
          ...(input.practitionerName !== undefined ? { practitionerName: input.practitionerName.trim() || null } : {}),
          ...(input.registrationNumber !== undefined ? { registrationNumber: input.registrationNumber.trim() || null } : {}),
          ...(input.taxId !== undefined ? { taxId: input.taxId.trim() || null } : {}),
          ...(input.currency !== undefined ? { currency: input.currency.trim() } : {}),
          ...(input.invoiceFooter !== undefined ? { invoiceFooter: input.invoiceFooter.trim() || null } : {}),
        },
      });
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'CLINIC_SETTINGS_UPDATED',
        resource: 'clinic',
        resourceId: clinic.id,
        metadata: { fields: Object.keys(input) },
      });
      return clinic;
    });
  }

  async listUsers(clinicId: string) {
    return this.prisma.user.findMany({
      where: { clinicId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, role: true, active: true, createdAt: true, updatedAt: true },
    });
  }

  async createUser(user: AuthenticatedUser, clinicId: string, input: CreateClinicUserDto) {
    const email = input.email.trim().toLowerCase();
    if (input.role === 'SUPER_ADMIN' || input.role === 'PATIENT') {
      throw new ConflictException('This role cannot be created through clinic administration.');
    }
    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw new ConflictException('A user with this email already exists.');
    const passwordHash = await hash(input.password, 12);
    return this.prisma.$transaction(async (transaction) => {
      const created = await transaction.user.create({
        data: {
          clinicId,
          email,
          passwordHash,
          role: input.role,
        },
        select: { id: true, email: true, role: true, active: true, createdAt: true },
      });
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'CLINIC_USER_CREATED',
        resource: 'user',
        resourceId: created.id,
        metadata: { role: created.role },
      });
      return created;
    });
  }

  async updateUser(user: AuthenticatedUser, clinicId: string, id: string, input: UpdateClinicUserDto) {
    if (input.role === 'SUPER_ADMIN' || input.role === 'PATIENT') {
      throw new ConflictException('This role cannot be assigned through clinic administration.');
    }
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.user.findFirst({ where: { id, clinicId }, select: { id: true } });
      if (!existing) throw new NotFoundException('User not found.');
      const updated = await transaction.user.update({
        where: { id },
        data: {
          ...(input.role !== undefined ? { role: input.role } : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
        },
        select: { id: true, email: true, role: true, active: true, updatedAt: true },
      });
      await transaction.refreshSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'CLINIC_USER_UPDATED',
        resource: 'user',
        resourceId: id,
        metadata: {
          ...(input.role !== undefined ? { role: input.role } : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
        },
      });
      return updated;
    });
  }
}
