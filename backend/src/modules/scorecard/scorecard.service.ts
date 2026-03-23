import { prisma }            from '../../lib/prisma'
import { runGapAnalysis }     from '../ai/ai.service'
import { calculatePassFail }  from '../../utils/score.util'

export async function generateScorecard(candidateId: string) {
  const candidate = await prisma.candidateProfile.findUniqueOrThrow({
    where:   { id: candidateId },
    include: {
      campaign: { select: { jobDescription: true, role: true } },
      attempts: {
        where:   { status: 'COMPLETED' },
        include: {
          mcqAnswers:        true,
          codingSubmissions: true,
          interviewAnswers:  {
            include: { question: { select: { prompt: true, topicTag: true } } },
          },
        },
        orderBy: { completedAt: 'asc' },
      },
      strikeLog: true,
    },
  })

  // Build round scores
  const roundScores = await Promise.all(candidate.attempts.map(async (attempt) => {
    const assigned = await prisma.question.findMany({
      where:  { id: { in: attempt.assignedQuestionIds as string[] } },
      select: { id: true, type: true, marksAwarded: true },
    })

    const mcqMap = new Map<string, number>()
    attempt.mcqAnswers.forEach(a => mcqMap.set(a.questionId, a.marksAwarded || 0))
    const mcqTotal    = Array.from(mcqMap.values()).reduce((s, m) => s + m, 0)
    const mcqMax      = assigned.filter(q => q.type === 'MCQ').reduce((s, q) => s + (q.marksAwarded || 1), 0)

    const codingMap = new Map<string, number>()
    attempt.codingSubmissions.forEach(s => {
      codingMap.set(s.questionId, Math.max(codingMap.get(s.questionId) || 0, s.marksAwarded || 0))
    })
    const codingTotal = Array.from(codingMap.values()).reduce((s, m) => s + m, 0)
    const codingMax   = assigned.filter(q => q.type === 'CODING').length * 10

    const intMap = new Map<string, number>()
    attempt.interviewAnswers.forEach(a =>
      intMap.set(a.questionId, Math.max(intMap.get(a.questionId) || 0, (a.aiScore || 0) / 10))
    )
    const interviewTotal = Array.from(intMap.values()).reduce((s, m) => s + m, 0)
    const interviewMax   = assigned.filter(q => q.type === 'INTERVIEW_PROMPT').length

    const rawScore = mcqTotal + codingTotal + interviewTotal
    const maxScore = Math.max(1, mcqMax + codingMax + interviewMax)
    const pctScore = Math.min(100, (rawScore / maxScore) * 100)

    const round = await prisma.pipelineRound.findUnique({
      where:  { id: attempt.roundId },
      select: { passMarkPercent: true, roundType: true, order: true },
    })
    const passMark = round?.passMarkPercent ?? 60

    return {
      roundId:         attempt.roundId,
      roundType:       round?.roundType || 'UNKNOWN',
      roundOrder:      round?.order     || 0,
      passMarkPercent: passMark,
      percentScore:    pctScore,
      passed:          pctScore >= passMark,
      startedAt:       attempt.startedAt,
      completedAt:     attempt.completedAt,
    }
  }))

  // Build interview answers for gap analysis
  const iaMap = new Map<string, any>()
  candidate.attempts.forEach(a => {
    a.interviewAnswers.forEach(ia => {
      iaMap.set(ia.questionId, {
        prompt:           ia.question?.prompt,
        topicTag:         ia.question?.topicTag,
        answer:           ia.textAnswer || ia.sttTranscript || '',
        aiScore:          ia.aiScore,
        aiReasoning:      ia.aiReasoning,
        mode:             ia.mode,
        codeScore:        (ia as any).codeScore,
        explainScore:     (ia as any).explainScore,
        copiedCodeSignal: (ia as any).copiedCodeSignal,
      })
    })
  })
  const interviewAnswers = Array.from(iaMap.values())
  const totalStrikes     = candidate.strikeLog.filter(s => s.isStrike).length

  const result = await runGapAnalysis({
    jobDescription:   candidate.campaign.jobDescription,
    role:             candidate.campaign.role,
    resumeText:       candidate.resumeText || '',
    roundScores,
    strikeCount:      totalStrikes,
    maxStrikes:       3,
    interviewAnswers,
  })

  // Upsert scorecard — campaignId required on create
  return prisma.scoreCard.upsert({
    where:  { candidateId },
    update: {
      technicalFitPercent: result.technicalFitPercent,
      trustScore:          result.trustScore,
      gapAnalysis:         result,
      roundScores,
      generatedAt:         new Date(),
    },
    create: {
      candidateId,
      campaignId:          candidate.campaignId,
      technicalFitPercent: result.technicalFitPercent,
      trustScore:          result.trustScore,
      gapAnalysis:         result,
      roundScores,
      generatedAt:         new Date(),
    },
  })
}

export async function getScorecard(candidateId: string) {
  return prisma.scoreCard.findUnique({
    where:   { candidateId },
    include: {
      candidate: {
        include: {
          user:      { select: { firstName: true, lastName: true, email: true } },
          strikeLog: { orderBy: { occurredAt: 'asc' } },
          campaign:  { select: { name: true, role: true } },
          attempts:  {
            include: {
              round: {
                select: { roundType: true, passMarkPercent: true, order: true },
              },
              interviewAnswers: {
                include: { question: { select: { prompt: true, topicTag: true } } },
                orderBy: { answeredAt: 'asc' },
              },
            },
            orderBy: { startedAt: 'asc' },
          },
        },
      },
    },
  })
}

export async function addRecruiterNote(candidateId: string, note: string, rating?: number) {
  return prisma.scoreCard.update({
    where: { candidateId },
    data:  { recruiterNotes: note, recruiterRating: rating },
  })
}