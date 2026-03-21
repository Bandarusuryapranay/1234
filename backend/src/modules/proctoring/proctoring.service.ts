import { prisma } from '../../lib/prisma'
import { blacklistToken } from '../../lib/jwt'
import { emitStrikeToRecruiters, emitTermination } from './proctoring.gateway'
import cloudinary from '../../lib/cloudinary'

const STRIKE_VIOLATIONS = ['PHONE_DETECTED','FACE_AWAY','MULTIPLE_FACES','TAB_SWITCH','FOCUS_LOSS']

export async function getCloudinarySignature(params: any = {}) {
  const timestamp = Math.round(new Date().getTime() / 1000)
  const signature = cloudinary.utils.api_sign_request(
    { ...params, timestamp },
    process.env.CLOUDINARY_API_SECRET!
  )
  return { 
    signature, 
    timestamp, 
    apiKey: process.env.CLOUDINARY_API_KEY, 
    cloudName: process.env.CLOUDINARY_CLOUD_NAME 
  }
}

export async function recordViolation(payload: {
  attemptId: string, candidateId: string, violationType: string,
  screenshotUrl?: string, mediapipeScore?: number, metadata?: any, currentToken: string
}) {
  const attempt = await prisma.candidateAttempt.findUniqueOrThrow({
    where: { id: payload.attemptId },
    select: { strikeCount: true, maxStrikes: true, status: true },
  })

  if (attempt.status === 'TERMINATED' || attempt.status === 'COMPLETED') {
    return { strikeCount: attempt.strikeCount, maxStrikes: attempt.maxStrikes, terminated: attempt.status === 'TERMINATED', isStrike: false }
  }

  const isStrike    = STRIKE_VIOLATIONS.includes(payload.violationType)
  const newCount    = isStrike ? attempt.strikeCount + 1 : attempt.strikeCount
  const terminated  = newCount >= attempt.maxStrikes

  let finalUrl = payload.screenshotUrl
  if (payload.screenshotUrl?.startsWith('data:image')) {
    const upload = await cloudinary.uploader.upload(payload.screenshotUrl, { folder: 'violations' })
    finalUrl = upload.secure_url
  }

  await prisma.strikeEvent.create({
    data: {
      candidateId:    payload.candidateId,
      attemptId:      payload.attemptId,
      violationType:  payload.violationType as any,
      strikeNumber:   newCount,
      isStrike,
      screenshotUrl:  finalUrl,
      mediapipeScore: payload.mediapipeScore,
      metadata:       payload.metadata,
    },
  })

  if (isStrike) {
    await prisma.candidateAttempt.update({
      where: { id: payload.attemptId },
      data:  { strikeCount: newCount, ...(terminated && { status: 'TERMINATED', terminatedAt: new Date() }) },
    })

    // Emit real-time strike event to recruiter dashboard
    const candidateForEmit = await prisma.candidateProfile.findUnique({
      where: { id: payload.candidateId },
      include: { campaign: { select: { id: true } }, user: { select: { firstName: true, lastName: true } } },
    })
    if (candidateForEmit) {
      emitStrikeToRecruiters(candidateForEmit.campaignId, {
        candidateId:   payload.candidateId,
        candidateName: `${candidateForEmit.user.firstName} ${candidateForEmit.user.lastName}`,
        violationType: payload.violationType,
        strikeCount:   newCount,
        maxStrikes:    attempt.maxStrikes,
        screenshotUrl: payload.screenshotUrl,
        ts:            new Date(),
      })
    }
  }

  if (terminated) {
    const candidate = await prisma.candidateProfile.findUniqueOrThrow({
      where: { id: payload.candidateId }, select: { userId: true, campaignId: true },
    })
    await blacklistToken(payload.currentToken, candidate.userId, 'STRIKE_TERMINATION')
    await prisma.candidateProfile.update({ where: { id: payload.candidateId }, data: { status: 'TERMINATED' } })
    // Emit termination to recruiter dashboard
    emitTermination(candidate.campaignId, payload.candidateId)
  }

  return { strikeCount: newCount, maxStrikes: attempt.maxStrikes, terminated, isStrike }
}

export async function appendMediapipeLog(attemptId: string, events: any[]) {
  const rec = await prisma.attemptRecording.findUnique({ where: { attemptId } })
  if (!rec) return
  const log = (rec.mediapipeLog as any[]) || []
  await prisma.attemptRecording.update({ where: { attemptId }, data: { mediapipeLog: [...log, ...events] } })
}

export async function appendBackgroundVoice(attemptId: string, flag: any) {
  const rec = await prisma.attemptRecording.findUnique({ where: { attemptId } })
  if (!rec) return
  const flags = (rec.backgroundVoiceFlags as any[]) || []
  await prisma.attemptRecording.update({ where: { attemptId }, data: { backgroundVoiceFlags: [...flags, flag] } })
}

export async function enrollCandidate(candidateId: string, descriptor: number[], photo: string) {
  const result = await cloudinary.uploader.upload(photo, {
    folder: 'enrollments',
    public_id: `enroll_${candidateId}`
  })

  return prisma.candidateProfile.update({
    where: { id: candidateId },
    data: {
      faceDescriptor: descriptor,
      enrollmentPhotoUrl: result.secure_url,
      enrolledAt: new Date(),
      status: 'READY'
    }
  })
}

export async function logProctoringViolation(data: {
  candidateId: string, sessionId: string, type: string,
  screenshot: string, // base64
  timestamp: string
}) {
  // 1. Upload screenshot
  const result = await cloudinary.uploader.upload(data.screenshot, { folder: 'violations' })
  
  // 2. Identify if it's a strike
  const isStrike = ['PHONE_DETECTED', 'MULTIPLE_FACES', 'FACE_MISMATCH'].includes(data.type)
  
  // 3. Save violation
  const violation = await prisma.violation.create({
    data: {
      type: data.type as any,
      candidateId: data.candidateId,
      sessionId: data.sessionId,
      screenshotUrl: result.secure_url,
      isStrike,
      detectedAt: new Date(data.timestamp)
    }
  })

  // 4. Handle strike limit & termination
  if (isStrike) {
    const session = await prisma.session.findUnique({
      where: { id: data.sessionId },
      include: { 
        violations: { where: { isStrike: true } },
        candidate: { include: { campaign: true } }
      }
    })
    
    const maxStrikes = (session?.candidate?.campaign?.pipelineConfig as any)?.proctoring?.maxStrikes || 3
    
    if (session && session.violations.length >= maxStrikes) {
      await prisma.session.update({
        where: { id: session.id },
        data: { status: 'TERMINATED', terminatedAt: new Date(), terminationReason: `Strike limit hit: ${data.type}` }
      })
      
      await prisma.candidateProfile.update({
        where: { id: data.candidateId },
        data: { status: 'TERMINATED' }
      })
      
      emitTermination(session.candidateId, data.candidateId) // Reuse termination event
    }
  }

  return violation
}

export async function createSession(candidateId: string) {
  return prisma.session.create({
    data: { candidateId, status: 'ACTIVE' }
  })
}

export async function saveRecording(attemptId: string, data: { videoUrl?: string, audioUrl?: string, durationSeconds?: number }) {
  return prisma.attemptRecording.upsert({
    where: { attemptId },
    update: { ...data, recordingEndedAt: new Date() },
    create: { attemptId, ...data, recordingEndedAt: new Date() },
  })
}