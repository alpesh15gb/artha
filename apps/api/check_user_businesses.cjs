const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'alpesh2060@gmail.com' },
    include: { businesses: true }
  });
  
  if (!user) {
    console.log('User not found');
    return;
  }
  
  console.log('User ID:', user.id);
  console.log('Business Count:', user.businesses.length);
  user.businesses.forEach(b => {
    console.log(` - Business: ${b.name} (ID: ${b.id}, userId: ${b.userId})`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
