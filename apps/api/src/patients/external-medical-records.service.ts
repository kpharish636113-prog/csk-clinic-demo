import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { writeAuditLog } from '../audit/audit-log.utils';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateExternalMedicalRecordDto,
  UpdateExternalMedicalRecordDto,
} from './external-medical-record.dto';
import { validatePatientReportFile } from './patient-report-file.utils';

@Injectable()
export class ExternalMedicalRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser, patientId: string) {
    return this.prisma.$transaction(async (transaction) => {
      await this.requirePatient(transaction, user.clinicId, patientId);
      const records = await transaction.externalMedicalRecord.findMany({
        where: { clinicId: user.clinicId, patientId },
        orderBy: [{ recordDate: 'desc' }, { createdAt: 'desc' }],
        include: { createdBy: { select: { email: true } } },
      });
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'EXTERNAL_MEDICAL_RECORDS_VIEWED',
        resource: 'patient',
        resourceId: patientId,
      });
      return records;
    });
  }

  async create(
    user: AuthenticatedUser,
    patientId: string,
    input: CreateExternalMedicalRecordDto,
  ) {
    const recordType = this.requireText(input.recordType, 'Record type');
    const doctorName = this.requireText(input.doctorName, 'Previous doctor');
    this.validateAttachment(input.fileDataUrl, input.fileName, input.mimeType);
    return this.prisma.$transaction(async (transaction) => {
      await this.requirePatient(transaction, user.clinicId, patientId);
      const record = await transaction.externalMedicalRecord.create({
        data: {
          clinicId: user.clinicId,
          patientId,
          createdById: user.sub,
          recordDate: new Date(input.recordDate),
          recordType,
          doctorName,
          facilityName: input.facilityName?.trim() || null,
          diagnosis: input.diagnosis?.trim() || null,
          treatment: input.treatment?.trim() || null,
          medications: input.medications?.trim() || null,
          investigations: input.investigations?.trim() || null,
          notes: input.notes?.trim() || null,
          fileName: this.cleanFileName(input.fileName),
          mimeType: input.fileDataUrl ? input.mimeType!.trim() : null,
          fileDataUrl: input.fileDataUrl?.trim() || null,
        },
        include: { createdBy: { select: { email: true } } },
      });
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'EXTERNAL_MEDICAL_RECORD_CREATED',
        resource: 'external_medical_record',
        resourceId: record.id,
        metadata: { patientId, recordType: record.recordType },
      });
      return record;
    });
  }

  async update(
    user: AuthenticatedUser,
    patientId: string,
    recordId: string,
    input: UpdateExternalMedicalRecordDto,
  ) {
    if (input.recordType !== undefined) this.requireText(input.recordType, 'Record type');
    if (input.doctorName !== undefined) this.requireText(input.doctorName, 'Previous doctor');
    if (input.removeAttachment && input.fileDataUrl) {
      throw new BadRequestException('Choose either a new attachment or attachment removal.');
    }
    if (input.fileDataUrl) {
      this.validateAttachment(input.fileDataUrl, input.fileName, input.mimeType);
    } else if (input.fileName !== undefined || input.mimeType !== undefined) {
      throw new BadRequestException('File name and MIME type must be supplied with an attachment.');
    }

    return this.prisma.$transaction(async (transaction) => {
      await this.requirePatient(transaction, user.clinicId, patientId);
      const existing = await transaction.externalMedicalRecord.findFirst({
        where: { id: recordId, clinicId: user.clinicId, patientId },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('External medical record not found.');

      const updated = await transaction.externalMedicalRecord.updateMany({
        where: { id: recordId, clinicId: user.clinicId, patientId },
        data: {
          ...(input.recordDate !== undefined ? { recordDate: new Date(input.recordDate) } : {}),
          ...(input.recordType !== undefined ? { recordType: input.recordType.trim() } : {}),
          ...(input.doctorName !== undefined ? { doctorName: input.doctorName.trim() } : {}),
          ...(input.facilityName !== undefined ? { facilityName: input.facilityName.trim() || null } : {}),
          ...(input.diagnosis !== undefined ? { diagnosis: input.diagnosis.trim() || null } : {}),
          ...(input.treatment !== undefined ? { treatment: input.treatment.trim() || null } : {}),
          ...(input.medications !== undefined ? { medications: input.medications.trim() || null } : {}),
          ...(input.investigations !== undefined ? { investigations: input.investigations.trim() || null } : {}),
          ...(input.notes !== undefined ? { notes: input.notes.trim() || null } : {}),
          ...(input.fileDataUrl
            ? {
                fileName: this.cleanFileName(input.fileName),
                mimeType: input.mimeType!.trim(),
                fileDataUrl: input.fileDataUrl.trim(),
              }
            : {}),
          ...(input.removeAttachment
            ? { fileName: null, mimeType: null, fileDataUrl: null }
            : {}),
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException('This external medical record changed before it could be saved. Refresh and retry.');
      }

      const record = await transaction.externalMedicalRecord.findFirstOrThrow({
        where: { id: recordId, clinicId: user.clinicId, patientId },
        include: { createdBy: { select: { email: true } } },
      });
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'EXTERNAL_MEDICAL_RECORD_UPDATED',
        resource: 'external_medical_record',
        resourceId: recordId,
        metadata: { patientId },
      });
      return record;
    });
  }

  private async requirePatient(
    transaction: Prisma.TransactionClient,
    clinicId: string,
    patientId: string,
  ) {
    const patient = await transaction.patient.findFirst({
      where: { id: patientId, clinicId },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient not found.');
    return patient;
  }

  private validateAttachment(fileDataUrl?: string, fileName?: string, mimeType?: string) {
    if (!fileDataUrl && (fileName || mimeType)) {
      throw new BadRequestException('File name and MIME type must be supplied with an attachment.');
    }
    validatePatientReportFile(fileDataUrl, fileName, mimeType);
  }

  private requireText(value: string, label: string) {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      throw new BadRequestException(`${label} must contain at least 2 characters.`);
    }
    return trimmed;
  }

  private cleanFileName(fileName?: string) {
    return fileName?.trim().replace(/[\\/\u0000-\u001f\u007f]/g, '_').slice(0, 255) || null;
  }
}
