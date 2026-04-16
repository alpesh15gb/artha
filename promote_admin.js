const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function promote(email) {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' }
    });
    console.log(`Success! ${email} has been promoted to ADMIN.`);
    console.log('You can now see the "System Control" link in the sidebar.');
  } catch (error) {
    console.error('Error promoting user:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2];
if (!email) {
  console.log('Please provide an email address: node promote_admin.js your@email.com');
} else {
  promote(email);
}
