import { z } from 'zod'

export const StartAttemptDto = z.object({
  roundId: z.string().uuid(),
})

export const SubmitMCQDto = z.object({
  attemptId:        z.string().uuid(),
  questionId:       z.string().uuid(),
  selectedOptionId: z.string().nullable(),
  timeTakenSeconds: z.number().optional(),
})

export const SubmitCodingDto = z.object({
  attemptId:        z.string().uuid(),
  questionId:       z.string().uuid(),
  language:         z.string(),
  sourceCode:       z.string(),
  timeTakenSeconds: z.number().optional(),
})

// ── Interview submit — JSON body (TEXT mode) ──────────────────
export const SubmitInterviewDto = z.object({
  attemptId:        z.string().uuid(),
  questionId:       z.string().uuid(),
  mode:             z.enum(['TEXT', 'AUDIO']).optional(),
  textAnswer:       z.string().optional(),
  audioUrl:         z.string().optional(),
  sttTranscript:    z.string().optional(),
  timeTakenSeconds: z.number().optional(),

  // Delivery / communication metrics — sent by frontend after computing
  durationSeconds:  z.number().optional(),  // total recording length
  speechDuration:   z.number().optional(),  // actual speaking time
  silenceRatio:     z.number().optional(),  // 0–1
  wordsPerMinute:   z.number().optional(),  // speaking pace
  wordCount:        z.number().int().optional(),
  fillerWordCount:  z.number().int().optional(),
  fillerWordRatio:  z.number().optional(),
  deliveryScore:    z.number().optional(),  // 0–10 computed on frontend
})

// LIVE_CODING Phase 1 — submit the code
export const SubmitLiveCodingCodeDto = z.object({
  attemptId:        z.string().uuid(),
  questionId:       z.string().uuid(),
  language:         z.string(),
  sourceCode:       z.string(),
  timeTakenSeconds: z.number().optional(),
})

// LIVE_CODING Phase 2 — submit audio explanation (multipart)
export const SubmitLiveCodingExplainDto = z.object({
  attemptId:  z.string().uuid(),
  answerId:   z.string().uuid(),
  questionId: z.string().uuid(),
  audioUrl:   z.string().optional(),
})

export const CompleteAttemptDto = z.object({
  attemptId: z.string().uuid(),
})

export type StartAttemptInput         = z.infer<typeof StartAttemptDto>
export type SubmitMCQInput            = z.infer<typeof SubmitMCQDto>
export type SubmitCodingInput         = z.infer<typeof SubmitCodingDto>
export type SubmitInterviewInput      = z.infer<typeof SubmitInterviewDto>
export type SubmitLiveCodingInput     = z.infer<typeof SubmitLiveCodingCodeDto>