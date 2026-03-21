import { prisma } from '../../lib/prisma'
import { poolGenerationQueue } from '../../jobs/queue'
import { APTITUDE_TOPICS } from '../ai/prompts/mcq.prompt'
import { DSA_TOPICS } from '../ai/prompts/coding.prompt'

export async function triggerPoolGeneration(campaignId: string) {
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where:   { id: campaignId },
    include: { rounds: true },
  })

  for (const round of campaign.rounds) {
    await prisma.questionPool.upsert({
      where:  { roundId: round.id },
      update: { status: 'REGENERATING', version: { increment: 1 } },
      create: {
        campaignId,
        roundId:     round.id,
        status:      'GENERATING',
        generatedBy: 'groq/llama-3.3-70b-versatile',
      },
    })
  }

  await poolGenerationQueue.add('generate', { campaignId }, { attempts: 3 })

  return { message: 'Pool generation started', campaignId }
}

export async function getPoolPreview(campaignId: string) {
  return prisma.questionPool.findMany({
    where:   { campaignId },
    include: {
      questions: {
        where:   { isActive: true },
        orderBy: [{ type: 'asc' }, { difficulty: 'asc' }],
      },
      round: { select: { order: true, roundType: true, roundConfig: true } },
    },
  })
}

export async function approveQuestion(questionId: string, approved: boolean) {
  return prisma.question.update({
    where: { id: questionId },
    data:  { isActive: approved },
  })
}

// ── Return available topics for the frontend ───────────────────
export function getAvailableTopics() {
  return {
    aptitude: Object.entries(APTITUDE_TOPICS).map(([category, topics]) => ({
      category: category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      topics,
    })),
    dsa: Object.entries(DSA_TOPICS).map(([category, topics]) => ({
      category: category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      topics,
    })),
  }
}