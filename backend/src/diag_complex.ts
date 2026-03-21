import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  try {
    const cp = await prisma.candidateProfile.findMany({
      include: {
        user: true,
        scorecard: true,
        strikeLog: true,
        attempts: true,
        proctoringSessions: true,
        newViolations: true
      },
      take: 1
    } as any)
    console.log('Successfully queried CandidateProfile with all new relations!')
    console.log('Result count:', cp.length)
  } catch (err) {
    console.error('DIAGNOSIS FAIL:', err)
  } finally {
    await prisma.$disconnect()
  }
}
main()
