import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  try {
    const count = await prisma.candidateProfile.count()
    console.log('Candidate count:', count)
    const sessions = await (prisma as any).session.findMany({ take: 1 })
    console.log('Sessions check:', sessions)
  } catch (err) {
    console.error('DIAGNOSIS ERROR:', err)
  } finally {
    await prisma.$disconnect()
  }
}
main()
