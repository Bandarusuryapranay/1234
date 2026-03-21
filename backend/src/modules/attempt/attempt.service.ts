import { prisma }             from '../../lib/prisma'
import { drawQuestions }      from '../../utils/question-draw.util'
import { calculateMCQScore, calculateCodingScore, calculatePassFail } from '../../utils/score.util'
import { runTestCases }       from '../ai/judge0.service'
import {
  evaluateInterviewAnswer,
  evaluateCodeExplanation,
  generateInterviewPrompts,
  transcribeAudio,
} from '../ai/ai.service'
import type {
  StartAttemptInput, SubmitMCQInput,
  SubmitCodingInput, SubmitInterviewInput,
  SubmitLiveCodingInput,
} from './attempt.dto'

// ── FIX 4: startAttempt — correct pool + resume personalisation ─
export async function startAttempt(candidateId: string, input: StartAttemptInput) {
  // ── 1. Fetch candidate + existing attempt in PARALLEL ──────────────────────
  const [candidate, existing] = await Promise.all([
    prisma.candidateProfile.findUniqueOrThrow({
      where:   { id: candidateId },
      include: { campaign: { include: { rounds: true } } },
    }),
    prisma.candidateAttempt.findFirst({
      where: { candidateId, roundId: input.roundId, status: { in: ['IN_PROGRESS', 'COMPLETED'] } },
    }),
  ])

  if (!['READY', 'IN_PROGRESS'].includes(candidate.status)) {
    throw { status: 400, message: 'Candidate is not ready to start assessment' }
  }

  if (existing) {
    if (existing.status === 'IN_PROGRESS') {
      // Re-fetch assigned questions so the frontend can render them
      const assignedIds = (existing.assignedQuestionIds as string[]) || []
      const [resumeQuestions, resumeRound, resumeSession] = await Promise.all([
        prisma.question.findMany({
          where: { id: { in: assignedIds } },
        }),
        prisma.pipelineRound.findUnique({
          where: { id: input.roundId },
          select: { roundConfig: true, roundType: true },
        }),
        prisma.session.create({ data: { candidateId } }),
      ])

      // Preserve original order from assignedQuestionIds
      const ordered = assignedIds
        .map(id => resumeQuestions.find(q => q.id === id))
        .filter(Boolean) as typeof resumeQuestions

      const resumeConfig = (resumeRound?.roundConfig as any) || {}

      const safeResumeQuestions = ordered.map((q: any) => ({
        id:               q.id,
        type:             q.type,
        difficulty:       q.difficulty,
        topicTag:         q.topicTag,
        stem:             q.stem,
        options:          q.options?.map((o: any) => ({ id: o.id, text: o.text })),
        problemTitle:     q.problemTitle,
        problemStatement: q.problemStatement,
        constraints:      q.constraints,
        examples:         q.examples,
        starterCode:      q.starterCode,
        prompt:           q.prompt,
        liveCodingProblem:    q.liveCodingProblem,
        liveCodingTestCases:  (q.liveCodingTestCases as any[])?.filter((tc: any) => !tc.isHidden),
        liveCodingStarter:    q.liveCodingStarter,
        explanationPrompt:    q.explanationPrompt,
        marksAwarded:         q.marksAwarded,
        interviewMode:        resumeConfig.interviewMode,
      }))

      return {
        attempt: existing,
        questions: safeResumeQuestions,
        sessionId: resumeSession.id,
        faceDescriptor: (candidate as any).faceDescriptor,
        interviewMode: resumeConfig.interviewMode ?? null,
        message: 'Resuming existing attempt',
      }
    }
    if (existing.status === 'COMPLETED') {
      throw { status: 409, message: 'You have already completed this round.', attemptId: existing.id }
    }
  }

  // ── 2. Fetch round + question pool ─────────────────────────────────────────
  const round = await prisma.pipelineRound.findUniqueOrThrow({
    where:   { id: input.roundId },
    include: {
      questionPool: {
        include: { questions: { where: { isActive: true } } },
      },
    },
  })

  if (!round.questionPool || round.questionPool.status !== 'READY') {
    throw { status: 400, message: 'Question pool is not ready yet.' }
  }

  const roundConfig   = round.roundConfig as any
  const isInterview   = round.roundType === 'INTERVIEW'
  const resumeSplit   = roundConfig.resumeSplit || 0

  // ── 3. Resume personalisation (INTERVIEW only) ────────────────────────────
  let poolQuestions = round.questionPool.questions

  if (isInterview && resumeSplit > 0 && candidate.resumeText) {
    try {
      const personalised = await generateInterviewPrompts(
        candidate.campaign.jobDescription,
        candidate.campaign.role,
        roundConfig,
        candidate.resumeText
      )
      const questionCount = roundConfig.questionCount || 5
      const createdQuestions = await prisma.$transaction(
        personalised.slice(0, Math.ceil(questionCount * 1.5)).map((q: any) =>
          prisma.question.create({
            data: {
              poolId:           round.questionPool!.id,
              type:             'INTERVIEW_PROMPT',
              difficulty:       q.difficulty || 'MEDIUM',
              topicTag:         q.topicTag,
              order:            999,
              prompt:           q.prompt,
              evaluationRubric: q.evaluationRubric,
              followUpPrompts:  q.followUpPrompts,
              liveCodingProblem:   q.liveCodingProblem,
              liveCodingTestCases: q.liveCodingTestCases,
              liveCodingStarter:   q.liveCodingStarter,
              explanationPrompt:   q.explanationPrompt,
              explanationRubric:   q.explanationRubric,
              marksAwarded:        q.marksAwarded || 1,
            },
          })
        )
      )
      poolQuestions = createdQuestions
    } catch (err) {
      console.warn('[Attempt] Resume personalisation failed, using base pool:', err)
    }
  }

  if (poolQuestions.length === 0) {
    throw { status: 400, message: 'No questions available. Ask admin to regenerate the pool.' }
  }

  let questionCount = 10;
  if (round.roundType === 'MCQ')     questionCount = roundConfig.totalQuestions || roundConfig.questionCount || 10;
  if (round.roundType === 'CODING')  questionCount = roundConfig.problemCount || 2; // Default 2 for coding if not set
  if (round.roundType === 'INTERVIEW') questionCount = roundConfig.questionCount || 5;

  const drawnQuestions = drawQuestions(poolQuestions, questionCount, roundConfig)
  const proctoring     = (candidate.campaign.pipelineConfig as any)?.proctoring || {}

  // ── 4. Batch all writes in a single transaction ───────────────────────────
  const [attempt, , session] = await prisma.$transaction([
    prisma.candidateAttempt.create({
      data: {
        candidateId,
        roundId:             input.roundId,
        campaignId:          candidate.campaignId,
        status:              'IN_PROGRESS',
        startedAt:           new Date(),
        timeLimitMinutes:    round.timeLimitMinutes,
        maxStrikes:          proctoring.maxStrikes || 3,
        assignedQuestionIds: drawnQuestions.map((q: any) => q.id),
      },
    }),
    // Conditional profile update — run unconditionally in tx for simplicity
    prisma.candidateProfile.update({
      where: { id: candidateId },
      data:  { status: candidate.status === 'READY' ? 'IN_PROGRESS' : candidate.status },
    }),
    prisma.session.create({ data: { candidateId } }),
  ])

  // AttemptRecording is fire-and-forget — create after tx so it never blocks
  prisma.attemptRecording
    .create({ data: { attemptId: attempt.id, recordingStartedAt: new Date() } })
    .catch(() => {})

  // ── 5. Strip sensitive fields ──────────────────────────────────────────────
  const safeQuestions = drawnQuestions.map((q: any) => ({
    id:               q.id,
    type:             q.type,
    difficulty:       q.difficulty,
    topicTag:         q.topicTag,
    stem:             q.stem,
    options:          q.options?.map((o: any) => ({ id: o.id, text: o.text })),
    problemTitle:     q.problemTitle,
    problemStatement: q.problemStatement,
    constraints:      q.constraints,
    examples:         q.examples,
    starterCode:      q.starterCode,
    prompt:           q.prompt,
    liveCodingProblem:  q.liveCodingProblem,
    liveCodingTestCases: (q.liveCodingTestCases as any[])?.filter((tc: any) => !tc.isHidden),
    liveCodingStarter:  q.liveCodingStarter,
    explanationPrompt:  q.explanationPrompt,
    marksAwarded:     q.marksAwarded,
    interviewMode:    roundConfig.interviewMode,
  }))

  return {
    attempt,
    questions: safeQuestions,
    sessionId: session.id,
    faceDescriptor: (candidate as any).faceDescriptor,
    interviewMode: roundConfig.interviewMode
  }
}



// ── Time enforcement ──────────────────────────────────────────
async function enforceTimeLimit(attemptId: string): Promise<void> {
  const attempt = await prisma.candidateAttempt.findUniqueOrThrow({
    where:  { id: attemptId },
    select: { startedAt: true, timeLimitMinutes: true, status: true },
  })
  if (!attempt.timeLimitMinutes || !attempt.startedAt) return
  if (attempt.status !== 'IN_PROGRESS') return
  const elapsed = (Date.now() - new Date(attempt.startedAt).getTime()) / 60000
  if (elapsed > attempt.timeLimitMinutes + 1) {
    await prisma.candidateAttempt.update({
      where: { id: attemptId },
      data:  { status: 'TIMED_OUT', completedAt: new Date() },
    })
    throw { status: 403, message: 'Time limit exceeded.', code: 'TIMED_OUT' }
  }
}

// ── Submit MCQ ────────────────────────────────────────────────
export async function submitMCQAnswer(input: SubmitMCQInput) {
  await enforceTimeLimit(input.attemptId)

  const question = await prisma.question.findUniqueOrThrow({
    where:  { id: input.questionId },
    select: { options: true, marksAwarded: true },
  })

  const options   = question.options as any[]
  const correct   = options.find((o) => o.isCorrect)
  const isCorrect = correct?.id === input.selectedOptionId

  const attempt  = await prisma.candidateAttempt.findUniqueOrThrow({ where: { id: input.attemptId } })
  const roundCfg = await prisma.pipelineRound.findUnique({ where: { id: attempt.roundId }, select: { roundConfig: true } })
  const cfg      = (roundCfg?.roundConfig as any) || {}

  const marksAwarded = calculateMCQScore({
    isCorrect, attempted: !!input.selectedOptionId,
    marksPerQuestion: question.marksAwarded,
    negativeMarking:  cfg.negativeMarking || false,
    penaltyPerWrong:  cfg.penaltyPerWrong || 0,
  })

  return prisma.mCQAnswer.upsert({
    where:  { attemptId_questionId: { attemptId: input.attemptId, questionId: input.questionId } },
    update: { selectedOptionId: input.selectedOptionId, isCorrect, marksAwarded, timeTakenSeconds: input.timeTakenSeconds },
    create: { attemptId: input.attemptId, questionId: input.questionId, selectedOptionId: input.selectedOptionId, isCorrect, marksAwarded, timeTakenSeconds: input.timeTakenSeconds },
  })
}

// ── Submit Coding ─────────────────────────────────────────────
export async function submitCodingAnswer(input: SubmitCodingInput) {
  await enforceTimeLimit(input.attemptId)

  const question = await prisma.question.findUniqueOrThrow({
    where:  { id: input.questionId },
    select: { testCases: true },
  })

  const submission = await prisma.codingSubmission.create({
    data: { attemptId: input.attemptId, questionId: input.questionId, language: input.language, sourceCode: input.sourceCode, statusDesc: 'PENDING' },
  })

  runTestCasesWithRetry(submission.id, input, question.testCases as any[])

  return { ...submission, message: 'Submission received. Test cases running.' }
}

export async function runCodingTestCases(input: SubmitCodingInput) {
  await enforceTimeLimit(input.attemptId)

  const question = await prisma.question.findUniqueOrThrow({
    where:  { id: input.questionId },
    select: { testCases: true, liveCodingTestCases: true },
  })

  const allTestCases = (question.testCases as any[] || question.liveCodingTestCases as any[] || [])
  const publicTestCases = allTestCases.filter(tc => !tc.isHidden)

  if (publicTestCases.length === 0) {
    throw { status: 400, message: 'No public test cases defined for this problem.' }
  }

  const results = await runTestCases({ 
    sourceCode: input.sourceCode, 
    language: input.language, 
    testCases: publicTestCases 
  })

  return results
}

async function runTestCasesWithRetry(submissionId: string, input: SubmitCodingInput, testCases: any[], attempt = 1) {
  try {
    const results = await runTestCases({ sourceCode: input.sourceCode, language: input.language, testCases })
    const marks   = calculateCodingScore(results.passed, results.total)
    await prisma.codingSubmission.update({
      where: { id: submissionId },
      data:  { testCaseResults: results.results, testCasesPassed: results.passed, testCasesTotal: results.total, marksAwarded: marks, statusDesc: results.passed === results.total ? 'Accepted' : 'Partial' },
    })
  } catch {
    if (attempt < 3) setTimeout(() => runTestCasesWithRetry(submissionId, input, testCases, attempt + 1), attempt * 3000)
    else await prisma.codingSubmission.update({ where: { id: submissionId }, data: { statusDesc: 'JUDGE0_ERROR' } })
  }
}

// ── Submit Interview (TEXT / AUDIO) ───────────────────────────
export async function submitInterviewAnswer(input: SubmitInterviewInput) {
  await enforceTimeLimit(input.attemptId)

  const question = await prisma.question.findUniqueOrThrow({
    where:  { id: input.questionId },
    select: { prompt: true, evaluationRubric: true, topicTag: true, followUpPrompts: true },
  })

  const attempt = await prisma.candidateAttempt.findUniqueOrThrow({
    where:   { id: input.attemptId },
    include: { candidate: { include: { campaign: { select: { role: true } } } } },
  })

  const answerText = input.textAnswer || input.sttTranscript || ''

  // Extract category from topicTag (e.g. "jd: React hooks" or "resume: Infosys project")
  const topicTag = question.topicTag || ''
  const category = topicTag.startsWith('resume:') ? 'RESUME_DRILL'
    : (question.followUpPrompts as any[])?.[0]?.category || undefined

  const evaluation = await evaluateInterviewAnswer({
    prompt:    question.prompt!,
    answer:    answerText,
    rubric:    question.evaluationRubric!,
    role:      attempt.candidate.campaign.role,
    category,
    topicTag,
  })

  return prisma.interviewAnswer.create({
    data: {
      attemptId:        input.attemptId,
      questionId:       input.questionId,
      mode:             input.textAnswer ? 'TEXT' : 'AUDIO',
      textAnswer:       input.textAnswer,
      audioUrl:         input.audioUrl,
      sttTranscript:    input.sttTranscript,
      aiScore:          evaluation.score,
      aiReasoning:      evaluation.reasoning,
      aiFollowUpAsked:  evaluation.followUp,
      timeTakenSeconds: input.timeTakenSeconds,
    },
  })
}

// ── Submit LIVE_CODING — Phase 1: submit code ─────────────────
// Called when candidate clicks "Submit Code" in the code editor
export async function submitLiveCodingCode(input: SubmitLiveCodingInput) {
  await enforceTimeLimit(input.attemptId)

  const question = await prisma.question.findUniqueOrThrow({
    where:  { id: input.questionId },
    select: { liveCodingTestCases: true, explanationPrompt: true, liveCodingProblem: true },
  })

  // Run code through Judge0
  const testCases = (question.liveCodingTestCases as any[]) || []
  let codeScore = 0
  let testResults: any = null

  if (testCases.length > 0) {
    try {
      const results = await runTestCases({ sourceCode: input.sourceCode, language: input.language, testCases })
      codeScore   = calculateCodingScore(results.passed, results.total) // 0–10
      testResults = results
    } catch {
      codeScore = 0
    }
  }

  // Create InterviewAnswer record with code — explanation comes in Phase 2
  const answer = await prisma.interviewAnswer.create({
    data: {
      attemptId:      input.attemptId,
      questionId:     input.questionId,
      mode:           'LIVE_CODING',
      codeSubmission: input.sourceCode,
      codeLanguage:   input.language,
      codeScore,
      // aiScore stays null until explanation is submitted
    },
  })

  return {
    answerId:         answer.id,
    codeScore,
    testResults,
    explanationPrompt: question.explanationPrompt || 'Now walk me through your solution. Explain your approach, the time and space complexity, and any trade-offs you considered.',
  }
}

// ── Submit LIVE_CODING — Phase 2: submit audio explanation ────
// Called after candidate records their explanation
export async function submitLiveCodingExplanation(input: {
  attemptId: string,
  answerId:  string,
  questionId:string,
  audioUrl?:  string,
  audioBuffer?: Buffer,
}) {
  await enforceTimeLimit(input.attemptId)

  // Get the existing answer with code
  const existing = await prisma.interviewAnswer.findUniqueOrThrow({
    where: { id: input.answerId },
  })

  const question = await prisma.question.findUniqueOrThrow({
    where:  { id: input.questionId },
    select: { liveCodingProblem: true, explanationRubric: true },
  })

  const attempt = await prisma.candidateAttempt.findUniqueOrThrow({
    where:   { id: input.attemptId },
    include: { candidate: { include: { campaign: { select: { role: true } } } } },
  })

  // Get audio buffer
  let audioBuffer: Buffer
  if (input.audioBuffer) {
    audioBuffer = input.audioBuffer
  } else if (input.audioUrl) {
    const response = await fetch(input.audioUrl)
    if (!response.ok) throw new Error('Failed to download audio from ' + input.audioUrl)
    const arrayBuffer = await response.arrayBuffer()
    audioBuffer = Buffer.from(arrayBuffer)
  } else {
    throw new Error('No audio source provided')
  }

  // Step 1: Transcribe audio via Groq Whisper
  const { text: transcript } = await transcribeAudio(audioBuffer)

  // Step 2: AI evaluates explanation against actual code
  const evaluation = await evaluateCodeExplanation({
    problem:    question.liveCodingProblem || '',
    code:       existing.codeSubmission || '',
    language:   existing.codeLanguage || 'unknown',
    transcript,
    rubric:     question.explanationRubric || '',
    role:       attempt.candidate.campaign.role,
  })

  // Step 3: Combine scores — 60% code, 40% explanation
  const codeScore    = existing.codeScore || 0
  const explainScore = evaluation.score
  let finalScore     = (codeScore * 0.6) + (explainScore * 0.4)

  // FIX: Cap at 6.5 if copy-paste detected (as per Scoring & Reports infographic)
  if (evaluation.copiedCodeSignal) {
    finalScore = Math.min(finalScore, 6.5)
  }

  // Update the answer record
  await prisma.interviewAnswer.update({
    where: { id: input.answerId },
    data: {
      explainTranscript: transcript,
      explainScore:      explainScore,
      aiScore:           finalScore,
      aiReasoning:       `Code: ${codeScore}/10 (Judge0 test cases) | Explanation: ${explainScore}/10 (AI evaluation) | Combined: ${finalScore.toFixed(1)}/10\n\n${evaluation.reasoning}`,
      aiFollowUpAsked:   evaluation.followUp,
    },
  })

  return {
    codeScore,
    explainScore,
    finalScore,
    copiedCodeSignal: evaluation.copiedCodeSignal,
    reasoning:        evaluation.reasoning,
    transcript,
  }
}

// ── Submit Interview (any mode) ───────────────────────────────
// Single endpoint the controller calls — routes by mode
export async function submitInterviewOrLiveCoding(input: any) {
  if (input.mode === 'LIVE_CODING_CODE') {
    return submitLiveCodingCode(input)
  }
  if (input.mode === 'LIVE_CODING_EXPLAIN') {
    return submitLiveCodingExplanation(input)
  }
  return submitInterviewAnswer(input)
}

// ── Complete attempt — auto-advance on PASS, auto-reject on FAIL
export async function completeAttempt(attemptId: string, candidateId: string) {
  const attempt = await prisma.candidateAttempt.findUniqueOrThrow({
    where:   { id: attemptId },
    include: { mcqAnswers: true, codingSubmissions: true, interviewAnswers: true },
  })

  const roundCfg = await prisma.pipelineRound.findUnique({
    where:  { id: attempt.roundId },
    select: { roundConfig: true, passMarkPercent: true },
  })
  const cfg = (roundCfg?.roundConfig as any) || {}

  // Fetch assigned questions to know the exact max score (based on what should have been answered)
  const assigned = await prisma.question.findMany({
    where:  { id: { in: attempt.assignedQuestionIds as string[] } },
    select: { id: true, type: true, marksAwarded: true },
  })

  // Group MCQs by questionId to avoid double counting (though upsert handles most cases)
  const mcqMap = new Map<string, number>()
  attempt.mcqAnswers.forEach(a => mcqMap.set(a.questionId, a.marksAwarded || 0))
  const mcqTotal = Array.from(mcqMap.values()).reduce((s, m) => s + m, 0)
  const mcqAssigned = assigned.filter(q => q.type === 'MCQ')
  const mcqMax = mcqAssigned.reduce((s, q) => s + (q.marksAwarded || cfg.marksPerQuestion || 1), 0)

  // Group Coding by questionId — take MAX marks per question
  const codingMap = new Map<string, number>()
  attempt.codingSubmissions.forEach(s => {
    const cur = codingMap.get(s.questionId) || 0
    codingMap.set(s.questionId, Math.max(cur, s.marksAwarded || 0))
  })
  const codingTotal = Array.from(codingMap.values()).reduce((s, m) => s + m, 0)
  const codingAssigned = assigned.filter(q => q.type === 'CODING')
  const codingMax = codingAssigned.length * 10

  // Group Interview by questionId
  const intMap = new Map<string, number>()
  attempt.interviewAnswers.forEach(a => intMap.set(a.questionId, Math.max(intMap.get(a.questionId) || 0, (a.aiScore || 0) / 10)))
  const interviewTotal = Array.from(intMap.values()).reduce((s, m) => s + m, 0)
  const intAssigned = assigned.filter(q => q.type === 'INTERVIEW_PROMPT')
  const interviewMax = intAssigned.length

  const rawScore = mcqTotal + codingTotal + interviewTotal
  const maxScore = Math.max(1, mcqMax + codingMax + interviewMax)
  const pctScore = Math.min(100, (rawScore / maxScore) * 100)
  const passMark = roundCfg?.passMarkPercent ?? 60
  const passed   = calculatePassFail(rawScore, maxScore, passMark)

  // Save attempt result
  await prisma.candidateAttempt.update({
    where: { id: attemptId },
    data:  { status: 'COMPLETED', completedAt: new Date(), rawScore, maxScore, percentScore: pctScore, passed },
  })

  // Auto-advance or auto-reject based on pass/fail
  const failAction = cfg.failAction || 'MANUAL_REVIEW'
  const candidate  = await prisma.candidateProfile.findUniqueOrThrow({
    where: { id: candidateId }, select: { campaignId: true },
  })

  const { handleRoundCompletion } = await import('./round-advancement.service')
  const advancement = await handleRoundCompletion({
    candidateId,
    campaignId:   candidate.campaignId,
    roundId:      attempt.roundId,
    passed,
    percentScore: pctScore,
    failAction,
  })

  return {
    ok:          true,
    score:       rawScore,
    percentScore:pctScore,
    passed,
    advancement, // contains outcome, reason, nextAction, nextRound (if advancing)
  }
}

export async function getAttemptQuestions(attemptId: string) {
  const attempt = await prisma.candidateAttempt.findUniqueOrThrow({ where: { id: attemptId } })

  const questions = await prisma.question.findMany({
    where:  { id: { in: attempt.assignedQuestionIds } },
    select: {
      id: true, type: true, difficulty: true, topicTag: true,
      stem: true, options: true,
      problemTitle: true, problemStatement: true, constraints: true, examples: true, starterCode: true,
      prompt: true, marksAwarded: true,
      liveCodingProblem: true, liveCodingTestCases: true, liveCodingStarter: true, explanationPrompt: true,
    },
  })

  return {
    attempt,
    questions: questions.map(q => ({
      ...q,
      options:             (q.options as any[])?.map((o: any) => ({ id: o.id, text: o.text })),
      liveCodingTestCases: (q.liveCodingTestCases as any[])?.filter((tc: any) => !tc.isHidden),
    })),
  }
}