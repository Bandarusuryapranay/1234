import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { lastLoginAt: 'desc' },
      take: 5,
      include: { candidateProfile: true }
    })
    console.log('Recent Users Status:')
    users.forEach(u => {
      console.log(`- ${u.email} (${u.role}): status=${u.candidateProfile?.status || 'N/A'}, isActive=${u.isActive}`)
    })
  } catch (err) {
    console.error(err)
  } finally {
    await prisma.$disconnect()
  }
}
main()
