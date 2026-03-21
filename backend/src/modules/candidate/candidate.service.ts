import { prisma }              from '../../lib/prisma'
import { extractTextFromPdf }  from '../../utils/file-upload.util'

export async function getMyProfile(candidateId: string) {
  const candidate = await prisma.candidateProfile.findUniqueOrThrow({
    where:   { id: candidateId },
    include: {
      user:     { select: { firstName: true, lastName: true, email: true } },
      campaign: {
        select: {
          name:           true,
          role:           true,
          pipelineConfig: true,
          rounds: {
            orderBy: { order: 'asc' },
            select:  { id: true, order: true, roundType: true, roundConfig: true, timeLimitMinutes: true, passMarkPercent: true },
          },
        },
      },
      attempts: {
        select: { roundId: true, status: true, percentScore: true, passed: true, startedAt: true, completedAt: true },
      },
    },
  })

  // Build enriched round list with live lock/unlock status
  const rounds = candidate.campaign.rounds.map((round, i) => {
    const attempt = candidate.attempts.find(a => a.roundId === round.id)
    const cfg     = round.roundConfig as any

    // Round is unlocked if:
    // - It's Round 1 (always accessible), OR
    // - Previous round has a COMPLETED + passed attempt
    let unlocked = i === 0
    if (i > 0) {
      const prevRound   = candidate.campaign.rounds[i - 1]
      const prevAttempt = candidate.attempts.find(a => a.roundId === prevRound.id)
      unlocked = !!(prevAttempt?.status === 'COMPLETED' && prevAttempt?.passed === true)
    }

    return {
      id:              round.id,
      order:           round.order,
      roundType:       round.roundType,
      timeLimitMinutes:round.timeLimitMinutes,
      passMarkPercent: round.passMarkPercent,
      interviewMode:   cfg?.interviewMode,
      questionCount:   cfg ? (cfg.totalQuestions || cfg.problemCount || cfg.questionCount) : 0,
      unlocked,
      attempt: attempt ? {
        status:      attempt.status,
        percentScore:attempt.percentScore,
        passed:      attempt.passed,
        startedAt:   attempt.startedAt,
        completedAt: attempt.completedAt,
      } : null,
    }
  })

  return {
    id:             candidate.id,
    status:         candidate.status,
    faceDescriptor: (candidate as any).faceDescriptor,
    user:           candidate.user,
    campaign: {
      name:           candidate.campaign.name,
      role:           candidate.campaign.role,
      pipelineConfig: candidate.campaign.pipelineConfig,
    },
    rounds, // enriched with lock/unlock status
  }
}

export async function uploadResume(candidateId: string, fileBuffer: Buffer, mimeType: string) {
  const resumeText = await extractTextFromPdf(fileBuffer)
  const resumeUrl  = `/uploads/resumes/${candidateId}.pdf`

  await prisma.candidateProfile.update({
    where: { id: candidateId },
    data:  { resumeUrl, resumeText },
  })

  const profile = await prisma.candidateProfile.findUniqueOrThrow({
    where:   { id: candidateId },
    include: { user: true },
  })

  if (!profile.user.mustChangePassword && profile.status === 'ONBOARDING') {
    await prisma.candidateProfile.update({
      where: { id: candidateId },
      data:  { status: 'READY' },
    })
  }

  return { resumeUrl, resumeText: resumeText.slice(0, 200) + '...' }
}

export async function getOnboardingStatus(candidateId: string) {
  const profile = await prisma.candidateProfile.findUniqueOrThrow({
    where:   { id: candidateId },
    include: { user: { select: { mustChangePassword: true } } },
  })

  return {
    passwordChanged: !profile.user.mustChangePassword,
    resumeUploaded:  !!profile.resumeUrl,
    status:          profile.status,
    canStartTest:    profile.status === 'READY' || profile.status === 'IN_PROGRESS',
  }
}

export async function saveIdentity(candidateId: string, descriptor: any, photoUrl: string) {
  return prisma.candidateProfile.update({
    where: { id: candidateId },
    data: {
      faceDescriptor:     descriptor,
      enrollmentPhotoUrl: photoUrl,
      enrolledAt:         new Date(),
    },
  })
}