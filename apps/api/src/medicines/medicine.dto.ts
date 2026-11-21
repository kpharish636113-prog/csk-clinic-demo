import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export enum StockOperation {
  RECEIVE = 'RECEIVE',
  DISPENSE = 'DISPENSE',
  SET = 'SET',
}

export class CreateMedicineDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  productSize?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  supplier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  batchNumber?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  quantity = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  reorderLevel = 10;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  purchasePrice = 0;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  sellingPrice!: number;
}

export class UpdateMedicineDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  manufacturer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  productSize?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  supplier?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  batchNumber?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  reorderLevel?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  purchasePrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(9999999999.99)
  sellingPrice?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ListMedicinesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  active = true;

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

export class AdjustMedicineStockDto {
  @IsEnum(StockOperation)
  operation!: StockOperation;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(2147483647)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

export class ListStockMovementsQueryDto {
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
