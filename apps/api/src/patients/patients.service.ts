import { Injectable, NotFoundException } from '@nestjs/common';
import { ConsumableStockMovementType, Gender, Prisma } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { AuthenticatedUser } from '../auth/auth.types';
import { writeAuditLog } from '../audit/audit-log.utils';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePatientDto,
  ListPatientsQueryDto,
  SavePatientDraftDto,
  UpdatePatientDto,
} from './patient.dto';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser, query: ListPatientsQueryDto) {
    const where: Prisma.PatientWhereInput = {
      clinicId: user.clinicId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { patientCode: { contains: query.search, mode: 'insensitive' } },
              { mobile: { contains: query.search } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    return this.prisma.$transaction(async (transaction) => {
      const [items, total] = await Promise.all([
        transaction.patient.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
          select: this.listSelect,
        }),
        transaction.patient.count({ where }),
      ]);
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'PATIENT_LIST_VIEWED',
        resource: 'patient',
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

  async listConsumableUsages(user: AuthenticatedUser, id: string) {
    return this.prisma.$transaction(async (transaction) => {
      const patient = await transaction.patient.findFirst({
        where: { id, clinicId: user.clinicId },
        select: { id: true },
      });
      if (!patient) throw new NotFoundException('Patient not found.');
      const items = await transaction.consumableStockMovement.findMany({
        where: { clinicId: user.clinicId, patientId: id, type: ConsumableStockMovementType.DISPENSED },
        include: {
          consumable: {
            select: { id: true, name: true, category: { select: { name: true } }, unit: true },
          },
          user: { select: { id: true, email: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'PATIENT_CONSUMABLE_USAGE_VIEWED',
        resource: 'patient',
        resourceId: id,
        metadata: { resultCount: items.length },
      });
      return items;
    });
  }

  async getById(user: AuthenticatedUser, id: string) {
    return this.prisma.$transaction(async (transaction) => {
      const patient = await transaction.patient.findFirst({
        where: { id, clinicId: user.clinicId },
      });
      if (!patient) {
        throw new NotFoundException('Patient not found.');
      }
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'PATIENT_RECORD_VIEWED',
        resource: 'patient',
        resourceId: id,
      });
      return patient;
    });
  }

  async listDrafts(user: AuthenticatedUser) {
    return this.prisma.$transaction(async (transaction) => {
      const drafts = await transaction.patientDraft.findMany({
        where: { clinicId: user.clinicId },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, payload: true, createdAt: true, updatedAt: true },
      });
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'PATIENT_DRAFT_LIST_VIEWED',
        resource: 'patient_draft',
        metadata: { resultCount: drafts.length },
      });
      return drafts;
    });
  }

  async createDraft(user: AuthenticatedUser, input: SavePatientDraftDto) {
    const payload = this.cleanDraftPayload(input);
    return this.prisma.$transaction(async (transaction) => {
      const draft = await transaction.patientDraft.create({
        data: { clinicId: user.clinicId, createdById: user.sub, payload },
        select: { id: true, payload: true, createdAt: true, updatedAt: true },
      });
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'PATIENT_DRAFT_CREATED',
        resource: 'patient_draft',
        resourceId: draft.id,
      });
      return draft;
    });
  }

  async updateDraft(user: AuthenticatedUser, id: string, input: SavePatientDraftDto) {
    const payload = this.cleanDraftPayload(input);
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.patientDraft.findFirst({
        where: { id, clinicId: user.clinicId },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Patient draft not found.');

      const draft = await transaction.patientDraft.update({
        where: { id },
        data: { payload },
        select: { id: true, payload: true, createdAt: true, updatedAt: true },
      });
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'PATIENT_DRAFT_UPDATED',
        resource: 'patient_draft',
        resourceId: id,
        metadata: { fields: Object.keys(payload) },
      });
      return draft;
    });
  }

  async deleteDraft(user: AuthenticatedUser, id: string) {
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.patientDraft.findFirst({
        where: { id, clinicId: user.clinicId },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Patient draft not found.');

      await transaction.patientDraft.delete({ where: { id } });
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'PATIENT_DRAFT_DELETED',
        resource: 'patient_draft',
        resourceId: id,
      });
      return { id };
    });
  }

  async create(user: AuthenticatedUser, input: CreatePatientDto) {
    const patientCode = await this.generatePatientCode(user.clinicId);
    return this.prisma.$transaction(async (transaction) => {
      const patient = await transaction.patient.create({
        data: {
          clinicId: user.clinicId,
          patientCode,
          fullName: input.fullName.trim(),
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          gender: input.gender ?? Gender.UNSPECIFIED,
          mobile: input.mobile.trim(),
          email: input.email?.trim().toLowerCase() || null,
          address: input.address?.trim(),
          emergencyContact: input.emergencyContact?.trim(),
          occupation: input.occupation?.trim(),
          maritalStatus: input.maritalStatus?.trim(),
          preferredLanguage: input.preferredLanguage?.trim(),
          insuranceProvider: input.insuranceProvider?.trim(),
          insuranceNumber: input.insuranceNumber?.trim(),
          bloodGroup: input.bloodGroup?.trim(),
          allergies: input.allergies?.trim(),
          medicalHistory: input.medicalHistory?.trim(),
          surgicalHistory: input.surgicalHistory?.trim(),
          familyHistory: input.familyHistory?.trim(),
          currentMedications: input.currentMedications?.trim(),
        },
      });
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'PATIENT_CREATED',
        resource: 'patient',
        resourceId: patient.id,
      });
      return patient;
    });
  }

  async update(user: AuthenticatedUser, id: string, input: UpdatePatientDto) {
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.patient.findFirst({
        where: { id, clinicId: user.clinicId },
        select: { id: true },
      });
      if (!existing) {
        throw new NotFoundException('Patient not found.');
      }

      const patient = await transaction.patient.update({
        where: { id },
        data: {
          ...(input.fullName !== undefined ? { fullName: input.fullName.trim() } : {}),
          ...(input.dateOfBirth !== undefined
            ? { dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null }
            : {}),
          ...(input.gender !== undefined ? { gender: input.gender } : {}),
          ...(input.mobile !== undefined ? { mobile: input.mobile.trim() } : {}),
          ...(input.email !== undefined ? { email: input.email?.trim().toLowerCase() || null } : {}),
          ...(input.address !== undefined ? { address: input.address.trim() } : {}),
          ...(input.emergencyContact !== undefined
            ? { emergencyContact: input.emergencyContact.trim() }
            : {}),
          ...(input.occupation !== undefined ? { occupation: input.occupation.trim() } : {}),
          ...(input.maritalStatus !== undefined ? { maritalStatus: input.maritalStatus.trim() } : {}),
          ...(input.preferredLanguage !== undefined
            ? { preferredLanguage: input.preferredLanguage.trim() }
            : {}),
          ...(input.insuranceProvider !== undefined
            ? { insuranceProvider: input.insuranceProvider.trim() }
            : {}),
          ...(input.insuranceNumber !== undefined
            ? { insuranceNumber: input.insuranceNumber.trim() }
            : {}),
          ...(input.bloodGroup !== undefined ? { bloodGroup: input.bloodGroup.trim() } : {}),
          ...(input.allergies !== undefined ? { allergies: input.allergies.trim() } : {}),
          ...(input.medicalHistory !== undefined
            ? { medicalHistory: input.medicalHistory.trim() }
            : {}),
          ...(input.surgicalHistory !== undefined
            ? { surgicalHistory: input.surgicalHistory.trim() }
            : {}),
          ...(input.familyHistory !== undefined
            ? { familyHistory: input.familyHistory.trim() }
            : {}),
          ...(input.currentMedications !== undefined
            ? { currentMedications: input.currentMedications.trim() }
            : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
      });
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'PATIENT_UPDATED',
        resource: 'patient',
        resourceId: id,
        metadata: { fields: Object.keys(input) },
      });
      return patient;
    });
  }

  private async generatePatientCode(clinicId: string): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `CSK-${new Date().getFullYear()}-${randomInt(100000, 1000000)}`;
      const exists = await this.prisma.patient.findUnique({
        where: { clinicId_patientCode: { clinicId, patientCode: code } },
        select: { id: true },
      });
      if (!exists) {
        return code;
      }
    }

    throw new Error('Could not generate a unique patient identifier.');
  }

  private cleanDraftPayload(input: SavePatientDraftDto): Prisma.InputJsonObject {
    const payload: Record<string, Prisma.InputJsonValue> = {};
    for (const [key, value] of Object.entries(input.payload)) {
      if (value !== undefined) payload[key] = value;
    }
    return payload;
  }

  private readonly listSelect = {
    id: true,
    patientCode: true,
    fullName: true,
    dateOfBirth: true,
    gender: true,
    mobile: true,
    email: true,
    bloodGroup: true,
    status: true,
    createdAt: true,
    updatedAt: true,
  } satisfies Prisma.PatientSelect;
}
