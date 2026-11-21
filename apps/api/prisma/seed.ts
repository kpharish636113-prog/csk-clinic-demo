import 'dotenv/config';
import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const clinicName = process.env.CLINIC_NAME?.trim() || 'CSK Clinic';

  if (!email || !password || password.length < 12) {
    throw new Error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters before seeding.');
  }

  const passwordHash = await hash(password, 12);
  await prisma.clinic.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: { name: clinicName },
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      name: clinicName,
    },
  });

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, active: true, role: UserRole.CLINIC_OWNER },
    create: {
      clinicId: '00000000-0000-4000-8000-000000000001',
      email,
      passwordHash,
      role: UserRole.CLINIC_OWNER,
    },
  });
}

main()
  .catch((error: unknown) => {
    console.error('Database seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
