import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { candidateProfile: { select: { status: true } } }
  })
  
  console.table(users.map(u => ({
    email: u.email,
    role: u.role,
    status: u.candidateProfile?.status || 'N/A',
    isActive: u.isActive,
    mustChangePassword: u.mustChangePassword
  })))
}

main().catch(console.error).finally(() => prisma.$disconnect())
