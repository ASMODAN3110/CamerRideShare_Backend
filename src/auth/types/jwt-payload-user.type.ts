import { UserRole } from '@prisma/client';

export interface JwtPayloadUser {
  userId: number;
  phoneNumber: string;
  role: UserRole;
}
