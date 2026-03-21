import { prisma } from '../../lib/prisma'
import { sendCandidateCredentials } from '../email/email.service'
import { generateTempPassword } from '../../utils/password.util'
import bcrypt from 'bcryptjs'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export async function getDashboardStats(userId: string, role: string) {
  let campaignIds: string[] = []
  
  if (role === 'ADMIN') {
    const all = await prisma.campaign.findMany({ select: { id: true } })
    campaignIds = all.map(c => c.id)
  } else {
    const recruiter = await prisma.recruiterProfile.findUnique({ where: { userId } })
    if (!recruiter) {
      return {
        summary: { total: 0, active: 0, pending: 0, completed: 0, shortlisted: 0 },
        recentCandidates: []
      }
    }
    const assignments = await prisma.campaignRecruiter.findMany({
      where: { recruiterId: recruiter.id },
      select: { campaignId: true },
    })
    campaignIds = assignments.map(a => a.campaignId)
  }

  if (campaignIds.length === 0) {
    return {
      summary: { total: 0, active: 0, pending: 0, completed: 0, shortlisted: 0 },
      recentCandidates: []
    }
  }

  const [total, active, pending, completed, shortlisted, recent] = await Promise.all([
    prisma.candidateProfile.count({ where: { campaignId: { in: campaignIds } } }),
    prisma.candidateProfile.count({ where: { campaignId: { in: campaignIds }, status: 'IN_PROGRESS' } }),
    prisma.candidateProfile.count({ where: { campaignId: { in: campaignIds }, status: { in: ['LOCKED', 'INVITED', 'ONBOARDING', 'READY'] } } }),
    prisma.candidateProfile.count({ where: { campaignId: { in: campaignIds }, status: 'COMPLETED' } }),
    prisma.candidateProfile.count({ where: { campaignId: { in: campaignIds }, status: 'SHORTLISTED' } }),
    prisma.candidateProfile.findMany({
      where: { campaignId: { in: campaignIds } },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        campaign: { select: { name: true, role: true } },
        scorecard: { select: { technicalFitPercent: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 5
    })
  ])

  return {
    summary: { total, active, pending, completed, shortlisted },
    recentCandidates: recent
  }
}

export async function getMyCampaigns(userId: string, role: string) {
  if (role === 'ADMIN') {
    const campaigns = await prisma.campaign.findMany({
      include: {
        rounds: { orderBy: { order: 'asc' } },
        _count: { select: { candidates: true } },
      },
      orderBy: { createdAt: 'desc' }
    })
    // Map to same format as recruiter response for compatibility
    return campaigns.map(c => ({
      campaignId: c.id,
      campaign: c
    }))
  }

  const recruiter = await prisma.recruiterProfile.findUnique({ where: { userId } })
  if (!recruiter) return []

  return prisma.campaignRecruiter.findMany({
    where:   { recruiterId: recruiter.id },
    include: {
      campaign: {
        include: {
          rounds: { orderBy: { order: 'asc' } },
          _count: { select: { candidates: true } },
        },
      },
    },
    orderBy: { assignedAt: 'desc' }
  })
}

export async function getCandidates(campaignId: string) {
  return prisma.candidateProfile.findMany({
    where:   { campaignId },
    include: {
      user:      { select: { firstName: true, lastName: true, email: true, lastLoginAt: true } },
      scorecard: { select: { technicalFitPercent: true, trustScore: true } },
      strikeLog: { orderBy: { occurredAt: 'desc' }, take: 5 },
      attempts:  { select: { id: true, status: true, strikeCount: true, roundId: true, percentScore: true, passed: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function grantPermission(candidateId: string) {
  const candidate = await prisma.candidateProfile.findUniqueOrThrow({
    where:   { id: candidateId },
    include: { user: true, campaign: { select: { name: true, role: true } } },
  })

  if (candidate.status !== 'LOCKED' && candidate.status !== 'INVITED') {
    throw { status: 400, message: `Candidate is already beyond the invitation stage (current status: ${candidate.status})` }
  }

  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  await prisma.user.update({
    where: { id: candidate.userId },
    data:  { passwordHash, mustChangePassword: true },
  })

  await prisma.candidateProfile.update({
    where: { id: candidateId },
    data:  { status: 'INVITED' },
  })

  await sendCandidateCredentials({
    candidateId,
    toEmail:       candidate.user.email,
    candidateName: `${candidate.user.firstName} ${candidate.user.lastName}`,
    tempPassword,
    campaignName:  candidate.campaign.name,
    role:          candidate.campaign.role,
    loginUrl:      `${process.env.CLIENT_URL}/auth/login`,
  })

  await prisma.auditLog.create({
    data: {
      action:     'CANDIDATE_UNLOCKED',
      entityType: 'CandidateProfile',
      entityId:   candidateId,
      metadata:   { email: candidate.user.email },
    },
  })

  return { ok: true, email: candidate.user.email }
}

export async function grantBulkPermission(candidateIds: string[]) {
  const results: Array<{ candidateId: string; email: string; success: boolean; reason?: string }> = []
  for (const candidateId of candidateIds) {
    try {
      const result = await grantPermission(candidateId)
      results.push({ candidateId, email: result.email, success: true })
    } catch (err: any) {
      results.push({ candidateId, email: '', success: false, reason: err.message || 'Failed' })
    }
  }
  return { total: candidateIds.length, sent: results.filter(r => r.success).length, results }
}

export async function updateCandidateStatus(candidateId: string, status: string) {
  return prisma.candidateProfile.update({
    where: { id: candidateId },
    data:  { status: status as any },
  })
}

export async function getLiveMonitor(campaignId: string) {
  return prisma.candidateProfile.findMany({
    where:   { campaignId, status: { in: ['IN_PROGRESS', 'READY'] } },
    include: {
      user:      { select: { firstName: true, lastName: true } },
      attempts:  {
        where:  { status: 'IN_PROGRESS' },
        select: { strikeCount: true, maxStrikes: true, roundId: true, startedAt: true },
      },
      strikeLog: { orderBy: { occurredAt: 'desc' }, take: 3 },
    },
  })
}

export async function addCandidate(campaignId: string, input: {
  email: string; firstName: string; lastName: string; phone?: string
}) {
  if (!isValidEmail(input.email)) {
    throw { status: 400, message: `Invalid email address: ${input.email}` }
  }

  const campaign = await prisma.campaign.findUniqueOrThrow({
    where:  { id: campaignId },
    select: { id: true, status: true, maxCandidates: true, _count: { select: { candidates: true } } },
  })

  if (['CLOSED', 'ARCHIVED'].includes(campaign.status)) {
    throw { status: 400, message: 'Campaign is not accepting candidates' }
  }

  if (campaign.maxCandidates && campaign._count.candidates >= campaign.maxCandidates) {
    throw { status: 400, message: 'Campaign has reached maximum candidate limit' }
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } })
  if (existing) {
    const alreadyIn = await prisma.candidateProfile.findFirst({ where: { userId: existing.id, campaignId } })
    if (alreadyIn) throw { status: 409, message: `${input.email} is already added to this campaign` }
  }

  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  const user = await prisma.user.upsert({
    where:  { email: input.email.toLowerCase() },
    update: {},
    create: {
      email:              input.email.toLowerCase(),
      firstName:          input.firstName,
      lastName:           input.lastName,
      passwordHash,
      role:               'CANDIDATE',
      mustChangePassword: true,
      isActive:           true,
    },
  })

  const candidate = await prisma.candidateProfile.create({
    data:    { userId: user.id, campaignId, status: 'LOCKED', phone: input.phone },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  })

  await prisma.auditLog.create({
    data: {
      action:     'CANDIDATE_ADDED',
      entityType: 'CandidateProfile',
      entityId:   candidate.id,
      metadata:   { campaignId, email: input.email },
    },
  })

  return candidate
}

export async function editCandidate(candidateId: string, input: {
  firstName: string; lastName: string; email?: string; phone?: string
}) {
  const candidate = await prisma.candidateProfile.findUniqueOrThrow({
    where: { id: candidateId },
    include: { user: true },
  })

  // 1. If email is changing, check for uniqueness
  if (input.email && input.email.toLowerCase() !== candidate.user.email.toLowerCase()) {
    const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } })
    if (existing) throw { status: 409, message: `Email ${input.email} is already in use by another user.` }
  }

  // 2. Update User (names + email)
  await prisma.user.update({
    where: { id: candidate.userId },
    data:  { 
      firstName: input.firstName, 
      lastName:  input.lastName,
      ...(input.email && { email: input.email.toLowerCase() })
    },
  })

  // 3. Update Profile (phone)
  await prisma.candidateProfile.update({
    where: { id: candidateId },
    data:  { phone: input.phone }
  })

  return { ok: true }
}

export async function deleteCandidate(candidateId: string) {
  await prisma.candidateProfile.delete({ where: { id: candidateId } })
  return { ok: true }
}

export async function getCandidateScorecard(candidateId: string) {
  return prisma.candidateProfile.findUniqueOrThrow({
    where:   { id: candidateId },
    include: {
      user:      { select: { firstName: true, lastName: true, email: true } },
      campaign:  { select: { name: true, role: true } },
      scorecard: true,
      strikeLog: { orderBy: { occurredAt: 'desc' } },
      attempts:  {
        include: {
          recording: true,
          interviewAnswers: {
            include: { question: { select: { prompt: true, topicTag: true } } },
          },
        },
      },
    },
  })
}

export async function saveRecruiterNotes(candidateId: string, data: {
  recruiterNotes?: string; recruiterRating?: number
}) {
  return prisma.scoreCard.update({
    where: { candidateId },
    data:  { recruiterNotes: data.recruiterNotes, recruiterRating: data.recruiterRating },
  })
}

export async function addCandidatesBulk(campaignId: string, rows: Array<{
  email: string; firstName: string; lastName: string; phone?: string
}>) {
  const results: Array<{ email: string; status: 'added' | 'skipped' | 'error'; reason?: string }> = []

  for (const row of rows) {
    if (!isValidEmail(row.email)) {
      results.push({ email: row.email, status: 'error', reason: 'Invalid email format' })
      continue
    }
    try {
      await addCandidate(campaignId, row)
      results.push({ email: row.email, status: 'added' })
    } catch (err: any) {
      results.push({ email: row.email, status: err.status === 409 ? 'skipped' : 'error', reason: err.message })
    }
  }

  return {
    total:   rows.length,
    added:   results.filter(r => r.status === 'added').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    errors:  results.filter(r => r.status === 'error').length,
    results,
  }
}

export async function reduceStrike(attemptId: string) {
  const attempt = await prisma.candidateAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    select: { id: true, strikeCount: true, maxStrikes: true, candidateId: true, status: true }
  })

  // If no strikes, nothing to do
  if (attempt.strikeCount <= 0) return { ok: true, count: 0 }

  const newCount = attempt.strikeCount - 1
  const wasTerminated = attempt.status === 'TERMINATED'
  const isNowSafe = newCount < attempt.maxStrikes

  // Update attempt
  await prisma.candidateAttempt.update({
    where: { id: attemptId },
    data: { 
      strikeCount: newCount,
      // If it was terminated but now below limit, restore to IN_PROGRESS
      ...(wasTerminated && isNowSafe && { status: 'IN_PROGRESS', terminatedAt: null })
    }
  })

  // Also restore candidate profile status if it was terminated
  if (wasTerminated && isNowSafe) {
    await prisma.candidateProfile.update({
      where: { id: attempt.candidateId },
      data: { status: 'IN_PROGRESS' }
    })
  }

  // Delete matching strike record from StrikeEvent (the last strike event)
  const lastStrike = await prisma.strikeEvent.findFirst({
    where: { attemptId, isStrike: true },
    orderBy: { occurredAt: 'desc' }
  })

  if (lastStrike) {
    await prisma.strikeEvent.delete({ where: { id: lastStrike.id } })
  }

  return { ok: true, count: newCount }
}