import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  sub: string;
  clinicId: string;
  role: UserRole;
}

