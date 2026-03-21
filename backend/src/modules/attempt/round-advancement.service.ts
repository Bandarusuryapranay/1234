import { prisma }  from '../../lib/prisma'
import { sendCandidateCredentials } from '../email/email.service'
import { logger }  from '../../lib/logger'
import { gapAnalysisQueue } from '../../jobs/queue'

// ── Called automatically after every round completion ─────────
export async function handleRoundCompletion(params: {
  candidateId: string
  campaignId:  string
  roundId:     string
  passed:      boolean
  percentScore:number
  failAction:  string  // 'AUTO_REJECT' | 'MANUAL_REVIEW'
}) {
  const { candidateId, campaignId, roundId, passed, percentScore, failAction } = params

  // Get full campaign pipeline + candidate
  const [campaign, candidate] = await Promise.all([
    prisma.campaign.findUniqueOrThrow({
      where:   { id: campaignId },
      include: { rounds: { orderBy: { order: 'asc' } } },
    }),
    prisma.candidateProfile.findUniqueOrThrow({
      where:   { id: candidateId },
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
    }),
  ])

  const currentRound = campaign.rounds.find(r => r.id === roundId)
  if (!currentRound) return

  const nextRound = campaign.rounds.find(r => r.order === currentRound.order + 1)
  const isLastRound = !nextRound

  // ── FAILED ────────────────────────────────────────────────────
  if (!passed) {
    if (failAction === 'AUTO_REJECT') {
      // Automatically reject — no human needed
      await prisma.candidateProfile.update({
        where: { id: candidateId },
        data:  { status: 'REJECTED' },
      })

      await prisma.auditLog.create({
        data: {
          action:     'CANDIDATE_AUTO_REJECTED',
          entityType: 'CandidateProfile',
          entityId:   candidateId,
          metadata:   {
            reason:       'Failed pass mark',
            roundId,
            roundOrder:   currentRound.order,
            percentScore: percentScore.toFixed(1),
            passMarkPercent: currentRound.passMarkPercent,
          },
        },
      })

      logger.info(`[RoundAdvancement] Candidate ${candidateId} AUTO-REJECTED after Round ${currentRound.order} — score ${percentScore.toFixed(1)}% < ${currentRound.passMarkPercent}%`)

      return {
        outcome:    'REJECTED',
        reason:     `You scored ${percentScore.toFixed(1)}% — the required pass mark is ${currentRound.passMarkPercent}%.`,
        nextAction: 'rejected',
      }

    } else {
      // MANUAL_REVIEW — flag for recruiter, admin can still override
      await prisma.candidateProfile.update({
        where: { id: candidateId },
        data:  { status: 'COMPLETED' },
      })

      logger.info(`[RoundAdvancement] Candidate ${candidateId} FLAGGED for review after Round ${currentRound.order} — score ${percentScore.toFixed(1)}%`)

      // Still queue gap analysis so recruiter has the scorecard
      await gapAnalysisQueue.add('analyze', { candidateId })

      return {
        outcome:    'FLAGGED',
        reason:     `You scored ${percentScore.toFixed(1)}% — below the pass mark of ${currentRound.passMarkPercent}%. Your recruiter will review your results.`,
        nextAction: 'pending_review',
      }
    }
  }

  // ── PASSED — last round ───────────────────────────────────────
  if (isLastRound) {
    await prisma.candidateProfile.update({
      where: { id: candidateId },
      data:  { status: 'COMPLETED' },
    })

    // Trigger final gap analysis
    await gapAnalysisQueue.add('analyze', { candidateId })

    logger.info(`[RoundAdvancement] Candidate ${candidateId} COMPLETED all rounds — score ${percentScore.toFixed(1)}%`)

    return {
      outcome:    'ALL_ROUNDS_COMPLETE',
      reason:     `Congratulations! You have completed all ${campaign.rounds.length} rounds.`,
      nextAction: 'complete',
    }
  }

  // ── PASSED — more rounds ahead → auto-advance ─────────────────
  // Candidate stays in their current session — next round unlocks
  // No new credentials needed, no recruiter action needed
  await prisma.candidateProfile.update({
    where: { id: candidateId },
    data:  { status: 'IN_PROGRESS' },
  })

  await prisma.auditLog.create({
    data: {
      action:     'CANDIDATE_AUTO_ADVANCED',
      entityType: 'CandidateProfile',
      entityId:   candidateId,
      metadata:   {
        fromRound:    currentRound.order,
        toRound:      nextRound.order,
        roundType:    nextRound.roundType,
        percentScore: percentScore.toFixed(1),
      },
    },
  })

  logger.info(`[RoundAdvancement] Candidate ${candidateId} AUTO-ADVANCED to Round ${nextRound.order} (${nextRound.roundType}) — score ${percentScore.toFixed(1)}%`)

  return {
    outcome:     'ADVANCED',
    reason:      `You passed Round ${currentRound.order} with ${percentScore.toFixed(1)}%! Round ${nextRound.order} is now unlocked.`,
    nextAction:  'continue',
    nextRound: {
      id:       nextRound.id,
      order:    nextRound.order,
      roundType:nextRound.roundType,
    },
  }
}

// ── Admin manual override — still available for FAILED candidates
export async function adminManualAdvance(candidateId: string, adminUserId: string) {
  const candidate = await prisma.candidateProfile.findUniqueOrThrow({
    where:   { id: candidateId },
    include: {
      campaign: { include: { rounds: { orderBy: { order: 'asc' } } } },
      attempts: { where: { status: 'COMPLETED' }, select: { roundId: true } },
    },
  })

  const completedRoundIds = candidate.attempts.map(a => a.roundId)
  const nextRound = candidate.campaign.rounds.find(r => !completedRoundIds.includes(r.id))

  if (!nextRound) throw { status: 400, message: 'No next round available' }

  // Reset candidate so they can continue in the same session
  await prisma.candidateProfile.update({
    where: { id: candidateId },
    data:  { status: 'IN_PROGRESS', isForwarded: false, adminDecision: 'ADVANCED' },
  })

  await prisma.auditLog.create({
    data: {
      actorId:    adminUserId,
      actorRole:  'ADMIN',
      action:     'CANDIDATE_MANUAL_ADVANCED',
      entityType: 'CandidateProfile',
      entityId:   candidateId,
      metadata:   { nextRoundId: nextRound.id, nextRoundOrder: nextRound.order },
    },
  })

  return { ok: true, nextRound: { id: nextRound.id, order: nextRound.order } }
}

export async function adminReject(candidateId: string, adminUserId: string, reason?: string) {
  await prisma.candidateProfile.update({
    where: { id: candidateId },
    data:  { status: 'REJECTED', isForwarded: false, adminDecision: 'REJECTED' },
  })

  await prisma.auditLog.create({
    data: {
      actorId:    adminUserId,
      actorRole:  'ADMIN',
      action:     'CANDIDATE_REJECTED',
      entityType: 'CandidateProfile',
      entityId:   candidateId,
      metadata:   { reason },
    },
  })

  return { ok: true }
}