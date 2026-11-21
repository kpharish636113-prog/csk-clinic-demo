import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MedicineStockMovementType,
  Prisma,
  UserRole,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { writeAuditLog } from '../audit/audit-log.utils';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdjustMedicineStockDto,
  CreateMedicineDto,
  ListMedicinesQueryDto,
  ListStockMovementsQueryDto,
  StockOperation,
  UpdateMedicineDto,
} from './medicine.dto';

@Injectable()
export class MedicinesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(clinicId: string, query: ListMedicinesQueryDto) {
    const where: Prisma.MedicineWhereInput = {
      clinicId,
      active: query.active,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { category: { contains: query.search, mode: 'insensitive' } },
              { batchNumber: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.medicine.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.medicine.count({ where }),
    ]);

    return {
      items: items.map((medicine) => ({
        ...medicine,
        lowStock: medicine.quantity <= medicine.reorderLevel,
      })),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async create(user: AuthenticatedUser, input: CreateMedicineDto) {
    const name = input.name.trim();
    if (!name) {
      throw new BadRequestException('Medicine name cannot be empty.');
    }

    const medicine = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.medicine.create({
        data: {
          clinicId: user.clinicId,
          name,
          category: input.category?.trim() || null,
          brand: input.brand?.trim() || null,
          manufacturer: input.manufacturer?.trim() || null,
          productSize: input.productSize?.trim() || null,
          supplier: input.supplier?.trim() || null,
          batchNumber: input.batchNumber?.trim() || null,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          quantity: input.quantity,
          reorderLevel: input.reorderLevel,
          purchasePrice: new Prisma.Decimal(input.purchasePrice),
          sellingPrice: new Prisma.Decimal(input.sellingPrice),
        },
      });

      if (input.quantity > 0) {
        await transaction.medicineStockMovement.create({
          data: {
            clinicId: user.clinicId,
            medicineId: created.id,
            userId: user.sub,
            type: MedicineStockMovementType.RECEIVED,
            quantityDelta: input.quantity,
            quantityBefore: 0,
            quantityAfter: input.quantity,
            reason: 'Opening stock',
          },
        });
      }
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'MEDICINE_CREATED',
        resource: 'medicine',
        resourceId: created.id,
        metadata: { openingQuantity: input.quantity },
      });

      return created;
    });

    return { ...medicine, lowStock: medicine.quantity <= medicine.reorderLevel };
  }

  async update(user: AuthenticatedUser, id: string, input: UpdateMedicineDto) {
    if (input.name !== undefined && !input.name.trim()) {
      throw new BadRequestException('Medicine name cannot be empty.');
    }

    const medicine = await this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.medicine.findFirst({
        where: { id, clinicId: user.clinicId },
        select: { id: true },
      });
      if (!existing) {
        throw new NotFoundException('Medicine not found.');
      }

      const updated = await transaction.medicine.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.category !== undefined ? { category: input.category.trim() || null } : {}),
          ...(input.brand !== undefined ? { brand: input.brand.trim() || null } : {}),
          ...(input.manufacturer !== undefined
            ? { manufacturer: input.manufacturer.trim() || null }
            : {}),
          ...(input.productSize !== undefined
            ? { productSize: input.productSize.trim() || null }
            : {}),
          ...(input.supplier !== undefined ? { supplier: input.supplier.trim() || null } : {}),
          ...(input.batchNumber !== undefined
            ? { batchNumber: input.batchNumber.trim() || null }
            : {}),
          ...(input.expiresAt !== undefined ? { expiresAt: new Date(input.expiresAt) } : {}),
          ...(input.reorderLevel !== undefined ? { reorderLevel: input.reorderLevel } : {}),
          ...(input.purchasePrice !== undefined
            ? { purchasePrice: new Prisma.Decimal(input.purchasePrice) }
            : {}),
          ...(input.sellingPrice !== undefined
            ? { sellingPrice: new Prisma.Decimal(input.sellingPrice) }
            : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
        },
      });
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'MEDICINE_UPDATED',
        resource: 'medicine',
        resourceId: id,
        metadata: { fields: Object.keys(input) },
      });
      return updated;
    });

    return { ...medicine, lowStock: medicine.quantity <= medicine.reorderLevel };
  }

  async adjustStock(user: AuthenticatedUser, id: string, input: AdjustMedicineStockDto) {
    if (
      input.operation === StockOperation.SET &&
      user.role !== UserRole.SUPER_ADMIN &&
      user.role !== UserRole.CLINIC_OWNER &&
      user.role !== UserRole.CLINIC_ADMIN
    ) {
      throw new BadRequestException('Only clinic managers can set stock levels.');
    }
    if (input.operation !== StockOperation.SET && input.quantity < 1) {
      throw new BadRequestException('Receive and dispense quantities must be greater than zero.');
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const medicine = await transaction.medicine.findFirst({
          where: { id, clinicId: user.clinicId, active: true },
        });
        if (!medicine) {
          throw new NotFoundException('Active medicine not found in this clinic.');
        }

        if (
          input.operation === StockOperation.DISPENSE &&
          medicine.expiresAt &&
          medicine.expiresAt.toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10)
        ) {
          throw new BadRequestException('Expired medicine cannot be dispensed.');
        }

        const quantityAfter =
          input.operation === StockOperation.RECEIVE
            ? medicine.quantity + input.quantity
            : input.operation === StockOperation.DISPENSE
              ? medicine.quantity - input.quantity
              : input.quantity;
        if (quantityAfter < 0) {
          throw new BadRequestException('Cannot dispense more units than are in stock.');
        }
        if (quantityAfter > 2147483647) {
          throw new BadRequestException('The resulting stock quantity is too large.');
        }

        const updated = await transaction.medicine.updateMany({
          where: { id, clinicId: user.clinicId, quantity: medicine.quantity },
          data: { quantity: quantityAfter },
        });
        if (updated.count !== 1) {
          throw new ConflictException('Stock changed during this operation. Refresh and retry.');
        }

        const movement = await transaction.medicineStockMovement.create({
          data: {
            clinicId: user.clinicId,
            medicineId: id,
            userId: user.sub,
            type:
              input.operation === StockOperation.RECEIVE
                ? MedicineStockMovementType.RECEIVED
                : input.operation === StockOperation.DISPENSE
                  ? MedicineStockMovementType.DISPENSED
                  : MedicineStockMovementType.ADJUSTED,
            quantityDelta: quantityAfter - medicine.quantity,
            quantityBefore: medicine.quantity,
            quantityAfter,
            reason: input.reason?.trim() || null,
          },
        });
        await writeAuditLog(transaction, {
          clinicId: user.clinicId,
          userId: user.sub,
          action: 'MEDICINE_STOCK_CHANGED',
          resource: 'medicine',
          resourceId: medicine.id,
          metadata: {
            operation: input.operation,
            quantityDelta: quantityAfter - medicine.quantity,
            quantityBefore: medicine.quantity,
            quantityAfter,
            movementId: movement.id,
          },
        });

        return {
          medicineId: medicine.id,
          quantity: quantityAfter,
          lowStock: quantityAfter <= medicine.reorderLevel,
          movement,
        };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        throw new ConflictException('Stock changed during this operation. Refresh and retry.');
      }
      throw error;
    }
  }

  async listStockMovements(
    user: AuthenticatedUser,
    medicineId: string,
    query: ListStockMovementsQueryDto,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const medicine = await transaction.medicine.findFirst({
        where: { id: medicineId, clinicId: user.clinicId },
        select: { id: true },
      });
      if (!medicine) {
        throw new NotFoundException('Medicine not found.');
      }

      const where = { clinicId: user.clinicId, medicineId };
      const [items, total] = await Promise.all([
        transaction.medicineStockMovement.findMany({
          where,
          include: { user: { select: { id: true, email: true, role: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        transaction.medicineStockMovement.count({ where }),
      ]);
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'MEDICINE_STOCK_HISTORY_VIEWED',
        resource: 'medicine',
        resourceId: medicineId,
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
}
