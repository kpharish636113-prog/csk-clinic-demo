import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PatientEncountersService } from './patient-encounters.service';
import { ExternalMedicalRecordsService } from './external-medical-records.service';
import {
  CreateExternalMedicalRecordDto,
  UpdateExternalMedicalRecordDto,
} from './external-medical-record.dto';
import {
  CreatePatientDto,
  ListPatientsQueryDto,
  SavePatientDraftDto,
  UpdatePatientDto,
} from './patient.dto';
import { PatientsService } from './patients.service';

const CLINIC_STAFF = [
  UserRole.SUPER_ADMIN,
  UserRole.CLINIC_OWNER,
  UserRole.CLINIC_ADMIN,
  UserRole.RECEPTIONIST,
  UserRole.DOCTOR,
  UserRole.NURSE,
];

const PATIENT_MANAGERS = [
  UserRole.SUPER_ADMIN,
  UserRole.CLINIC_OWNER,
  UserRole.CLINIC_ADMIN,
  UserRole.RECEPTIONIST,
  UserRole.NURSE,
];

const CLINICAL_RECORD_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.CLINIC_OWNER,
  UserRole.CLINIC_ADMIN,
  UserRole.DOCTOR,
  UserRole.NURSE,
];

@Controller('patients')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...CLINIC_STAFF)
export class PatientsController {
  constructor(
    private readonly patients: PatientsService,
    private readonly encounters: PatientEncountersService,
    private readonly externalMedicalRecords: ExternalMedicalRecordsService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListPatientsQueryDto) {
    return this.patients.list(user, query);
  }

  @Get('drafts')
  @Roles(...PATIENT_MANAGERS)
  listDrafts(@CurrentUser() user: AuthenticatedUser) {
    return this.patients.listDrafts(user);
  }

  @Post('drafts')
  @Roles(...PATIENT_MANAGERS)
  createDraft(@CurrentUser() user: AuthenticatedUser, @Body() body: SavePatientDraftDto) {
    return this.patients.createDraft(user, body);
  }

  @Patch('drafts/:id')
  @Roles(...PATIENT_MANAGERS)
  updateDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: SavePatientDraftDto,
  ) {
    return this.patients.updateDraft(user, id, body);
  }

  @Delete('drafts/:id')
  @Roles(...PATIENT_MANAGERS)
  deleteDraft(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.patients.deleteDraft(user, id);
  }

  @Get(':id')
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.patients.getById(user, id);
  }

  @Post()
  @Roles(...PATIENT_MANAGERS)
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreatePatientDto) {
    return this.patients.create(user, body);
  }

  @Patch(':id')
  @Roles(...PATIENT_MANAGERS)
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: UpdatePatientDto,
  ) {
    return this.patients.update(user, id, body);
  }

  @Get(':id/records')
  @Roles(...CLINICAL_RECORD_ROLES)
  listRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.encounters.list(user, id);
  }

  @Get(':id/intakes')
  @Roles(...CLINICAL_RECORD_ROLES)
  listIntakes(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.encounters.listIntakes(user, id);
  }

  @Get(':id/external-records')
  @Roles(...CLINICAL_RECORD_ROLES)
  listExternalRecords(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.externalMedicalRecords.list(user, id);
  }

  @Get(':id/consumable-usages')
  @Roles(...CLINICAL_RECORD_ROLES)
  listConsumableUsages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.patients.listConsumableUsages(user, id);
  }

  @Post(':id/external-records')
  @Roles(...CLINICAL_RECORD_ROLES)
  createExternalRecord(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: CreateExternalMedicalRecordDto,
  ) {
    return this.externalMedicalRecords.create(user, id, body);
  }

  @Patch(':id/external-records/:recordId')
  @Roles(...CLINICAL_RECORD_ROLES)
  updateExternalRecord(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('recordId', new ParseUUIDPipe()) recordId: string,
    @Body() body: UpdateExternalMedicalRecordDto,
  ) {
    return this.externalMedicalRecords.update(user, id, recordId, body);
  }
}
