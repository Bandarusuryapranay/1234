import { poolGenerationQueue } from './queue'
import { prisma }              from '../lib/prisma'
import { generateMCQs, generateCodingProblems, generateInterviewPrompts } from '../modules/ai/ai.service'
import { logger } from '../lib/logger'

poolGenerationQueue.process('generate', async (job) => {
  const { campaignId } = job.data
  logger.info(`[PoolGen] Starting for campaign ${campaignId}`)

  const campaign = await prisma.campaign.findUniqueOrThrow({
    where:   { id: campaignId },
    include: { rounds: { include: { questionPool: true } } },
  })

  for (const round of campaign.rounds) {
    const cfg  = round.roundConfig as any
    const mode = cfg.questionMode || cfg.interviewMode || 'JD_BASED'
    logger.info(`[PoolGen] Round ${round.order} (${round.roundType}) — mode: ${mode}`)

    let questions: any[] = []

    if (round.roundType === 'MCQ') {
      questions = await generateMCQs(campaign.jobDescription, campaign.role, cfg)

    } else if (round.roundType === 'CODING') {
      questions = await generateCodingProblems(campaign.jobDescription, campaign.role, cfg)

    } else if (round.roundType === 'INTERVIEW') {
      // NOTE: For interview rounds, resume text is per-candidate so we generate
      // a JD-based pool here. Resume-personalisation happens at attempt start
      // when we have the specific candidate's resume. If resumeSplit = 0, this
      // pool is used directly. If resumeSplit > 0, questions are regenerated
      // per-candidate at attempt start (see attempt.service.ts startAttempt).
      const needsPerCandidateGen = (cfg.resumeSplit || 0) > 0
      if (needsPerCandidateGen) {
        // Generate a base JD pool — per-candidate personalisation at attempt start
        logger.info(`[PoolGen] Round ${round.order} has resumeSplit=${cfg.resumeSplit}% — base JD pool only, personalisation happens at attempt start`)
      }
      questions = await generateInterviewPrompts(campaign.jobDescription, campaign.role, cfg)

    } else if (round.roundType === 'MIXED') {
      for (const slice of (cfg.slices || [])) {
        if (slice.type === 'MCQ')       questions.push(...await generateMCQs(campaign.jobDescription, campaign.role, slice))
        if (slice.type === 'CODING')    questions.push(...await generateCodingProblems(campaign.jobDescription, campaign.role, slice))
        if (slice.type === 'INTERVIEW') questions.push(...await generateInterviewPrompts(campaign.jobDescription, campaign.role, slice))
      }
    }

    // Upsert pool record
    const pool = await prisma.questionPool.upsert({
      where:  { roundId: round.id },
      update: { status: 'GENERATING', version: { increment: 1 } },
      create: {
        campaignId,
        roundId:     round.id,
        status:      'GENERATING',
        generatedBy: `groq/${MODEL}`,
      },
    })

    await prisma.question.deleteMany({ where: { poolId: pool.id } })

    if (questions.length > 0) {
      await prisma.question.createMany({
        data: questions.map((q: any, i: number) => ({
          poolId:              pool.id,
          type:                q.type === 'INTERVIEW' ? 'INTERVIEW_PROMPT' : (q.type || 'INTERVIEW_PROMPT'),
          difficulty:          q.difficulty,
          topicTag:            q.topicTag,
          order:               i,
          // MCQ
          stem:                q.stem,
          options:             q.options,
          explanation:         q.explanation,
          marksAwarded:        q.marksAwarded || 1,
          // Coding
          problemTitle:        q.problemTitle,
          problemStatement:    q.problemStatement,
          constraints:         q.constraints,
          examples:            q.examples,
          testCases:           q.testCases,
          starterCode:         q.starterCode,
          // Interview
          prompt:              q.prompt,
          evaluationRubric:    q.evaluationRubric,
          followUpPrompts:     q.followUpPrompts,
          // LIVE_CODING
          liveCodingProblem:   q.liveCodingProblem,
          liveCodingTestCases: q.liveCodingTestCases,
          liveCodingStarter:   q.liveCodingStarter,
          explanationPrompt:   q.explanationPrompt,
          explanationRubric:   q.explanationRubric,
        })),
      })
    }

    await prisma.questionPool.update({
      where: { id: pool.id },
      data:  { status: 'READY', generatedAt: new Date() },
    })

    logger.info(`[PoolGen] Round ${round.order} — ${questions.length} questions saved`)
  }

  return { ok: true, campaignId }
})

const MODEL = 'llama-3.3-70b-versatile'

poolGenerationQueue.on('failed', (job: any, err: any) => {
  logger.error(`[PoolGen] Failed for campaign ${job.data.campaignId}: ${err.message}`)
})