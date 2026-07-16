import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const existingAdmin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN },
  });

  if (existingAdmin) {
    console.log('ℹ️  Admin déjà existant (id=' + existingAdmin.id + ') — seed ignoré.');
    return;
  }

  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'abdoulrahimmomo@gmail.com',
      phoneNumber: '692100263',
      fullName: 'Admin CamerRideShare',
      role: UserRole.ADMIN,
      passwordHash,
    },
  });

  console.log(`✅ Admin créé : 692100263 / password123 (id=${admin.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
