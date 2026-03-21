import { prisma } from '../../lib/prisma'
import { generateTempPassword } from '../../utils/password.util'
import { sendForwardToAdmin } from '../email/email.service'
import bcrypt from 'bcryptjs'

export async function advanceCandidateToNextRound(candidateId: string, adminUserId: string) {
  const candidate = await prisma.candidateProfile.findUniqueOrThrow({
    where: { id: candidateId },
    include: {
      user:     true,
      campaign: { include: { rounds: { orderBy: { order: 'asc' } } } },
      attempts: { where: { status: 'COMPLETED' }, select: { roundId: true } },
    },
  })

  const completedRoundIds = candidate.attempts.map(a => a.roundId)
  const nextRound = candidate.campaign.rounds.find(r => !completedRoundIds.includes(r.id))

  if (!nextRound) {
    throw { status: 400, message: 'Candidate has already completed all rounds' }
  }

  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  await prisma.user.update({
    where: { id: candidate.userId },
    data:  { passwordHash, mustChangePassword: true },
  })

  await prisma.candidateProfile.update({
    where: { id: candidateId },
    data:  { status: 'LOCKED', isForwarded: false },
  })

  await prisma.auditLog.create({
    data: {
      actorId:    adminUserId,
      actorRole:  'ADMIN',
      action:     'CANDIDATE_ADVANCED_ROUND',
      entityType: 'CandidateProfile',
      entityId:   candidateId,
      metadata:   { nextRoundId: nextRound.id, nextRoundOrder: nextRound.order, roundType: nextRound.roundType },
    },
  })

  return {
    ok:        true,
    candidateId,
    nextRound: { id: nextRound.id, order: nextRound.order, roundType: nextRound.roundType },
    message:   `Candidate advanced to Round ${nextRound.order} (${nextRound.roundType}). Recruiter must grant permission.`,
  }
}

export async function rejectCandidate(candidateId: string, adminUserId: string, reason?: string) {
  await prisma.candidateProfile.update({
    where: { id: candidateId },
    data:  { status: 'REJECTED', isForwarded: false },
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

  return { ok: true, candidateId, status: 'REJECTED' }
}

export async function forwardScorecardToAdmin(candidateId: string, recruiterUserId: string) {
  const candidate = await prisma.candidateProfile.findUniqueOrThrow({
    where: { id: candidateId },
    include: {
      user:     { select: { firstName: true, lastName: true, email: true } },
      campaign: {
        include: {
          admin: { include: { user: { select: { email: true, firstName: true } } } },
        },
      },
      scorecard: true,
    },
  })

  if (!candidate.scorecard) {
    throw { status: 400, message: 'Scorecard not generated yet. Generate it first.' }
  }

  const sc  = candidate.scorecard as any
  const gap = sc.gapAnalysis as any

  await sendForwardToAdmin({
    candidateId,
    toEmail:       candidate.campaign.admin.user.email,
    adminName:     candidate.campaign.admin.user.firstName,
    candidateName: `${candidate.user.firstName} ${candidate.user.lastName}`,
    role:          candidate.campaign.role,
    campaignName:  candidate.campaign.name,
    fitPercent:    sc.technicalFitPercent || 0,
    trustScore:    sc.trustScore || 0,
    aiSummary:     gap?.aiSummary || '',
    missingSkills: gap?.jdMissingSkills || [],
    recruiterNotes:sc.recruiterNotes || '',
    scorecardUrl:  `${process.env.CLIENT_URL}/admin/candidates/${candidateId}`,
  })

  await prisma.candidateProfile.update({
    where: { id: candidateId },
    data:  { isForwarded: true, adminDecision: null }
  })
  
  return { ok: true, forwardedTo: candidate.campaign.admin.user.email }
}