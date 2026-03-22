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
      create: { campaignId, roundId: round.id, status: 'GENERATING', generatedBy: 'groq/llama-3.3-70b-versatile' },
    })
  }
  await poolGenerationQueue.add('generate', { campaignId }, { attempts: 3 })
  return { message: 'Pool generation started', campaignId }
}

// ALL questions — pending + approved + rejected
export async function getPoolPreview(campaignId: string) {
  return prisma.questionPool.findMany({
    where:   { campaignId },
    include: {
      questions: { orderBy: [{ type: 'asc' }, { difficulty: 'asc' }] },
      round:     { select: { order: true, roundType: true, roundConfig: true } },
    },
  })
}

export async function approveQuestion(questionId: string, approved: boolean) {
  return prisma.question.update({ where: { id: questionId }, data: { isActive: approved } })
}

export async function approveAllInPool(poolId: string) {
  const result = await prisma.question.updateMany({ where: { poolId }, data: { isActive: true } })
  return { approved: result.count }
}

export async function rejectAllInPool(poolId: string) {
  const result = await prisma.question.updateMany({ where: { poolId }, data: { isActive: false } })
  return { rejected: result.count }
}

export async function getApprovalStatus(campaignId: string) {
  const pools = await prisma.questionPool.findMany({
    where:   { campaignId },
    include: {
      questions: { select: { id: true, isActive: true } },
      round:     { select: { order: true, roundType: true, roundConfig: true } },
    },
  })
  return pools.map(pool => {
    const cfg             = pool.round.roundConfig as any
    const totalQ          = pool.questions.length
    const approvedQ       = pool.questions.filter(q => q.isActive).length
    const requiredForRound = cfg.totalQuestions || cfg.questionCount || cfg.problemCount || 5
    const minimumApproved  = Math.ceil(requiredForRound * 1.5)
    return {
      poolId: pool.id, roundOrder: pool.round.order, roundType: pool.round.roundType,
      totalQuestions: totalQ, approvedCount: approvedQ,
      pendingCount: totalQ - approvedQ, minimumRequired: minimumApproved,
      isReady: approvedQ >= minimumApproved, poolStatus: pool.status,
    }
  })
}

export function getAvailableTopics() {
  return {
    aptitude: Object.entries(APTITUDE_TOPICS).map(([category, topics]) => ({
      category: category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), topics,
    })),
    dsa: Object.entries(DSA_TOPICS).map(([category, topics]) => ({
      category: category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), topics,
    })),
  }
}