import { Gender, PatientStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  Matches,
  IsDateString,
  IsObject,
  ValidateNested,
} from 'class-validator';

export class CreatePatientDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  fullName!: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string | null;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsString()
  @Matches(/^[+0-9()\-\s]{7,20}$/)
  @Matches(/\d/, { message: 'Mobile number must include at least one digit.' })
  mobile!: string;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  occupation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  preferredLanguage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  insuranceProvider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  insuranceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  bloodGroup?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  allergies?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  medicalHistory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  surgicalHistory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  familyHistory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  currentMedications?: string;
}

export class UpdatePatientDto {
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  fullName?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string | null;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  @Matches(/^[+0-9()\-\s]{7,20}$/)
  @Matches(/\d/, { message: 'Mobile number must include at least one digit.' })
  mobile?: string;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  occupation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  preferredLanguage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  insuranceProvider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  insuranceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  bloodGroup?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  allergies?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  medicalHistory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  surgicalHistory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  familyHistory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  currentMedications?: string;

  @IsOptional()
  @IsEnum(PatientStatus)
  status?: PatientStatus;
}

export class ListPatientsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsEnum(PatientStatus)
  status?: PatientStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class PatientDraftPayloadDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  fullName?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mobile?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  emergencyContact?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  occupation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  maritalStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  preferredLanguage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  insuranceProvider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  insuranceNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  bloodGroup?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  allergies?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  medicalHistory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  surgicalHistory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  familyHistory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  currentMedications?: string;
}

export class SavePatientDraftDto {
  @IsObject()
  @ValidateNested()
  @Type(() => PatientDraftPayloadDto)
  payload!: PatientDraftPayloadDto;
}

