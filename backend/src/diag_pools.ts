import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  const pools = await p.questionPool.findMany({
    include: { questions: { select: { id: true, type: true } } }
  })
  for (const pool of pools) {
    console.log(`Pool: ${pool.id} | status: ${pool.status} | questions: ${pool.questions.length}`)
  }

  const attempts = await p.candidateAttempt.findMany({
    select: { id: true, status: true, roundId: true, assignedQuestionIds: true }
  })
  for (const a of attempts) {
    const ids = a.assignedQuestionIds as string[]
    console.log(`Attempt: ${a.id} | status: ${a.status} | assignedQuestions: ${ids?.length ?? 0}`)
  }
}
main().catch(console.error).finally(() => p.$disconnect())
