import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConsumableStockMovementType } from '@prisma/client';
import { AuthenticatedUser } from '../src/auth/auth.types';
import { ConsumablesService } from '../src/consumables/consumables.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('ConsumablesService', () => {
  const clinicId = '00000000-0000-4000-8000-000000000002';
  const itemId = '00000000-0000-4000-8000-000000000003';
  const user: AuthenticatedUser = {
    sub: '00000000-0000-4000-8000-000000000001',
    clinicId,
    role: 'CLINIC_ADMIN',
  };

  it('records opening stock and its audit trail when creating a supply', async () => {
    const transaction = {
      consumableCategory: { upsert: jest.fn().mockResolvedValue({ id: 'category-1' }) },
      consumable: {
        create: jest.fn().mockResolvedValue({
          id: itemId,
          quantity: 12,
          reorderLevel: 3,
        }),
      },
      consumableStockMovement: { create: jest.fn().mockResolvedValue({ id: 'movement-1' }) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
    } as unknown as PrismaService;
    const service = new ConsumablesService(prisma);

    await expect(service.create(user, {
      name: ' Sterile Gauze ',
      category: ' Dressing ',
      quantity: 12,
      reorderLevel: 3,
      purchasePrice: 2.5,
      sellingPrice: 4,
    })).resolves.toMatchObject({ id: itemId, lowStock: false });

    expect(transaction.consumableStockMovement.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        type: ConsumableStockMovementType.RECEIVED,
        quantityDelta: 12,
        quantityBefore: 0,
        quantityAfter: 12,
      }),
    }));
    expect(transaction.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'CONSUMABLE_CREATED', resourceId: itemId }),
    }));
  });

  it('records an atomic, auditable supply stock movement', async () => {
    const transaction = {
      consumable: {
        findFirst: jest.fn().mockResolvedValue({ id: itemId, quantity: 8, reorderLevel: 2 }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      consumableStockMovement: { create: jest.fn().mockResolvedValue({ id: 'movement-2' }) },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-2' }) },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
    } as unknown as PrismaService;
    const service = new ConsumablesService(prisma);

    await expect(service.adjustStock(
      { ...user, role: 'NURSE' },
      itemId,
      { operation: ConsumableStockMovementType.DISPENSED, quantity: 3, reason: 'Used during intake' },
    )).resolves.toMatchObject({ quantity: 5, lowStock: false });
    expect(transaction.consumable.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: itemId, clinicId, quantity: 8 },
      data: { quantity: 5 },
    }));
    expect(transaction.consumableStockMovement.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        quantityDelta: -3,
        quantityBefore: 8,
        quantityAfter: 5,
        reason: 'Used during intake',
      }),
    }));
  });

  it('rejects unauthorized stock setting and stale stock writes', async () => {
    const nursePrisma = { $transaction: jest.fn() } as unknown as PrismaService;
    const service = new ConsumablesService(nursePrisma);
    await expect(service.adjustStock(
      { ...user, role: 'NURSE' },
      itemId,
      { operation: ConsumableStockMovementType.ADJUSTED, quantity: 5 },
    )).rejects.toBeInstanceOf(BadRequestException);
    expect(nursePrisma.$transaction).not.toHaveBeenCalled();

    const transaction = {
      consumable: {
        findFirst: jest.fn().mockResolvedValue({ id: itemId, quantity: 8, reorderLevel: 2 }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const stalePrisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction)),
    } as unknown as PrismaService;
    await expect(new ConsumablesService(stalePrisma).adjustStock(user, itemId, {
      operation: ConsumableStockMovementType.DISPENSED,
      quantity: 9,
    })).rejects.toBeInstanceOf(BadRequestException);
    await expect(new ConsumablesService(stalePrisma).adjustStock(user, itemId, {
      operation: ConsumableStockMovementType.DISPENSED,
      quantity: 2,
    })).rejects.toBeInstanceOf(ConflictException);
  });
});
