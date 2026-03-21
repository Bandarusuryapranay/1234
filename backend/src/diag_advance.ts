import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const candidateId = '1bcce139-eeda-4c8e-885a-a4fc05994893'
  try {
    const candidate = await prisma.candidateProfile.findUniqueOrThrow({
      where: { id: candidateId },
      include: {
        campaign: { include: { rounds: { orderBy: { order: 'asc' } } } },
        attempts: true
      }
    })
    console.log('Candidate Status:', candidate.status)
    console.log('isForwarded:', (candidate as any).isForwarded)
    console.log('adminDecision:', (candidate as any).adminDecision)
    console.log('Campaign Rounds:', candidate.campaign.rounds.map(r => ({ id: r.id, order: r.order })))
    console.log('Attempts:', candidate.attempts.map(a => ({ id: a.id, status: a.status, roundId: a.roundId })))
    
    const completedRoundIds = candidate.attempts.filter(a => a.status === 'COMPLETED').map(a => a.roundId)
    const nextRound = candidate.campaign.rounds.find(r => !completedRoundIds.includes(r.id))
    console.log('Calculated Next Round:', nextRound?.id || 'NONE')
  } catch (err) {
    console.error(err)
  } finally {
    await prisma.$disconnect()
  }
}
main()
