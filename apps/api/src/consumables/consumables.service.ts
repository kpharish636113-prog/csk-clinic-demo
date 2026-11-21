import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConsumableStockMovementType,
  Prisma,
  UserRole,
} from '@prisma/client';
import { AuthenticatedUser } from '../auth/auth.types';
import { writeAuditLog } from '../audit/audit-log.utils';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdjustConsumableStockDto,
  CreateConsumableDto,
  ListConsumablesQueryDto,
  ListConsumableMovementsQueryDto,
  UpdateConsumableDto,
} from './consumables.dto';

@Injectable()
export class ConsumablesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(clinicId: string, query: ListConsumablesQueryDto) {
    const where: Prisma.ConsumableWhereInput = {
      clinicId,
      active: query.active,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { brand: { contains: query.search, mode: 'insensitive' } },
              { batchNumber: { contains: query.search, mode: 'insensitive' } },
              { supplier: { contains: query.search, mode: 'insensitive' } },
              { category: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.consumable.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.consumable.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        lowStock: item.quantity <= item.reorderLevel,
      })),
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  listCategories(clinicId: string) {
    return this.prisma.consumableCategory.findMany({
      where: { clinicId, active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    });
  }

  async create(user: AuthenticatedUser, input: CreateConsumableDto) {
    const name = input.name.trim();
    const categoryName = input.category.trim();
    if (!name || !categoryName) {
      throw new BadRequestException('Supply name and category are required.');
    }

    const consumable = await this.prisma.$transaction(async (transaction) => {
      const category = await transaction.consumableCategory.upsert({
        where: { clinicId_name: { clinicId: user.clinicId, name: categoryName } },
        create: { clinicId: user.clinicId, name: categoryName },
        update: { active: true },
        select: { id: true },
      });
      const created = await transaction.consumable.create({
        data: {
          clinicId: user.clinicId,
          categoryId: category.id,
          name,
          brand: input.brand?.trim() || null,
          manufacturer: input.manufacturer?.trim() || null,
          productSize: input.productSize?.trim() || null,
          unit: input.unit?.trim() || 'unit',
          batchNumber: input.batchNumber?.trim() || null,
          expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
          quantity: input.quantity,
          reorderLevel: input.reorderLevel,
          purchasePrice: new Prisma.Decimal(input.purchasePrice),
          sellingPrice: new Prisma.Decimal(input.sellingPrice),
          supplier: input.supplier?.trim() || null,
          storageInstructions: input.storageInstructions?.trim() || null,
        },
      });
      if (input.quantity > 0) {
        await transaction.consumableStockMovement.create({
          data: {
            clinicId: user.clinicId,
            consumableId: created.id,
            userId: user.sub,
            type: ConsumableStockMovementType.RECEIVED,
            quantityDelta: input.quantity,
            quantityBefore: 0,
            quantityAfter: input.quantity,
            unitCost: new Prisma.Decimal(input.purchasePrice),
            supplier: input.supplier?.trim() || null,
            reason: 'Opening stock',
          },
        });
      }
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'CONSUMABLE_CREATED',
        resource: 'consumable',
        resourceId: created.id,
        metadata: { openingQuantity: input.quantity },
      });
      return created;
    });

    return {
      ...consumable,
      lowStock: consumable.quantity <= consumable.reorderLevel,
    };
  }

  async update(user: AuthenticatedUser, id: string, input: UpdateConsumableDto) {
    if (input.name !== undefined && !input.name.trim()) {
      throw new BadRequestException('Supply name cannot be empty.');
    }
    if (input.category !== undefined && !input.category.trim()) {
      throw new BadRequestException('Supply category cannot be empty.');
    }

    const consumable = await this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.consumable.findFirst({
        where: { id, clinicId: user.clinicId },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Supply not found.');

      const category = input.category
        ? await transaction.consumableCategory.upsert({
            where: { clinicId_name: { clinicId: user.clinicId, name: input.category.trim() } },
            create: { clinicId: user.clinicId, name: input.category.trim() },
            update: { active: true },
            select: { id: true },
          })
        : null;
      const updated = await transaction.consumable.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(category ? { categoryId: category.id } : {}),
          ...(input.brand !== undefined ? { brand: input.brand.trim() || null } : {}),
          ...(input.manufacturer !== undefined ? { manufacturer: input.manufacturer.trim() || null } : {}),
          ...(input.productSize !== undefined ? { productSize: input.productSize.trim() || null } : {}),
          ...(input.unit !== undefined ? { unit: input.unit.trim() } : {}),
          ...(input.batchNumber !== undefined ? { batchNumber: input.batchNumber.trim() || null } : {}),
          ...(input.expiresAt !== undefined ? { expiresAt: new Date(input.expiresAt) } : {}),
          ...(input.reorderLevel !== undefined ? { reorderLevel: input.reorderLevel } : {}),
          ...(input.purchasePrice !== undefined
            ? { purchasePrice: new Prisma.Decimal(input.purchasePrice) }
            : {}),
          ...(input.sellingPrice !== undefined
            ? { sellingPrice: new Prisma.Decimal(input.sellingPrice) }
            : {}),
          ...(input.supplier !== undefined ? { supplier: input.supplier.trim() || null } : {}),
          ...(input.storageInstructions !== undefined
            ? { storageInstructions: input.storageInstructions.trim() || null }
            : {}),
          ...(input.active !== undefined ? { active: input.active } : {}),
        },
      });
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'CONSUMABLE_UPDATED',
        resource: 'consumable',
        resourceId: id,
        metadata: { fields: Object.keys(input) },
      });
      return updated;
    });

    return {
      ...consumable,
      lowStock: consumable.quantity <= consumable.reorderLevel,
    };
  }

  async adjustStock(user: AuthenticatedUser, id: string, input: AdjustConsumableStockDto) {
    const { operation, quantity } = input;
    const managersCanSet =
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.CLINIC_OWNER ||
      user.role === UserRole.CLINIC_ADMIN;
    if (operation === ConsumableStockMovementType.ADJUSTED && !managersCanSet) {
      throw new BadRequestException('Only clinic managers can set stock levels.');
    }
    if (operation !== ConsumableStockMovementType.ADJUSTED && quantity < 1) {
      throw new BadRequestException('Stock movement quantity must be greater than zero.');
    }

    try {
      return await this.prisma.$transaction(async (transaction) => {
        const consumable = await transaction.consumable.findFirst({
          where: { id, clinicId: user.clinicId, active: true },
        });
        if (!consumable) {
          throw new NotFoundException('Active supply was not found in this clinic.');
        }

        const isReceipt = operation === ConsumableStockMovementType.RECEIVED;
        const isAdjustment = operation === ConsumableStockMovementType.ADJUSTED;
        const quantityAfter = isReceipt
          ? consumable.quantity + quantity
          : isAdjustment
            ? quantity
            : consumable.quantity - quantity;
        if (quantityAfter < 0) {
          throw new BadRequestException('Cannot record more used or discarded units than are in stock.');
        }
        if (quantityAfter > 2147483647) {
          throw new BadRequestException('The resulting stock quantity is too large.');
        }

        const update = await transaction.consumable.updateMany({
          where: { id, clinicId: user.clinicId, quantity: consumable.quantity },
          data: {
            quantity: quantityAfter,
            ...(isReceipt && input.unitCost !== undefined
              ? { purchasePrice: new Prisma.Decimal(input.unitCost) }
              : {}),
            ...(isReceipt && input.supplier !== undefined
              ? { supplier: input.supplier.trim() || null }
              : {}),
          },
        });
        if (update.count !== 1) {
          throw new ConflictException('Stock changed during this operation. Refresh and retry.');
        }

        if (input.patientId) {
          const patient = await transaction.patient.findFirst({
            where: { id: input.patientId, clinicId: user.clinicId },
            select: { id: true },
          });
          if (!patient) throw new NotFoundException('Patient was not found in this clinic.');
        }
        if (input.encounterId) {
          const encounter = await transaction.patientEncounter.findFirst({
            where: { id: input.encounterId, clinicId: user.clinicId, patientId: input.patientId ?? undefined },
            select: { id: true },
          });
          if (!encounter) throw new NotFoundException('Encounter was not found for this patient.');
        }

        const movement = await transaction.consumableStockMovement.create({
          data: {
            clinicId: user.clinicId,
            consumableId: id,
            userId: user.sub,
            ...(input.patientId ? { patientId: input.patientId } : {}),
            ...(input.encounterId ? { encounterId: input.encounterId } : {}),
            ...(input.invoiceId ? { invoiceId: input.invoiceId } : {}),
            type: operation,
            quantityDelta: quantityAfter - consumable.quantity,
            quantityBefore: consumable.quantity,
            quantityAfter,
            unitCost: input.unitCost === undefined ? null : new Prisma.Decimal(input.unitCost),
            supplier: input.supplier?.trim() || null,
            reason: input.reason?.trim() || null,
          },
        });
        await writeAuditLog(transaction, {
          clinicId: user.clinicId,
          userId: user.sub,
          action: 'CONSUMABLE_STOCK_CHANGED',
          resource: 'consumable',
          resourceId: id,
          metadata: {
            operation,
            quantityDelta: quantityAfter - consumable.quantity,
            quantityBefore: consumable.quantity,
            quantityAfter,
            movementId: movement.id,
          },
        });

        return {
          consumableId: id,
          quantity: quantityAfter,
          lowStock: quantityAfter <= consumable.reorderLevel,
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

  async listMovements(
    user: AuthenticatedUser,
    consumableId: string,
    query: ListConsumableMovementsQueryDto,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const consumable = await transaction.consumable.findFirst({
        where: { id: consumableId, clinicId: user.clinicId },
        select: { id: true },
      });
      if (!consumable) throw new NotFoundException('Supply not found.');

      const where = { clinicId: user.clinicId, consumableId };
      const [items, total] = await Promise.all([
        transaction.consumableStockMovement.findMany({
          where,
          include: { user: { select: { id: true, email: true, role: true } } },
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        transaction.consumableStockMovement.count({ where }),
      ]);
      await writeAuditLog(transaction, {
        clinicId: user.clinicId,
        userId: user.sub,
        action: 'CONSUMABLE_STOCK_HISTORY_VIEWED',
        resource: 'consumable',
        resourceId: consumableId,
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
