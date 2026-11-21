import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateExternalMedicalRecordDto {
  @IsDateString()
  recordDate!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  recordType!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  doctorName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  facilityName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  diagnosis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  treatment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  medications?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  investigations?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000000)
  fileDataUrl?: string;
}

export class UpdateExternalMedicalRecordDto {
  @IsOptional()
  @IsDateString()
  recordDate?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  recordType?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  doctorName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  facilityName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  diagnosis?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  treatment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  medications?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  investigations?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000000)
  fileDataUrl?: string;

  @IsOptional()
  @IsBoolean()
  removeAttachment?: boolean;
}
