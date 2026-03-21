import { z } from 'zod'

export const GeneratePoolDto = z.object({
  campaignId: z.string().uuid(),
})

export const ApproveQuestionDto = z.object({
  questionId: z.string().uuid(),
  approved:   z.boolean(),
})

export type GeneratePoolInput    = z.infer<typeof GeneratePoolDto>
export type ApproveQuestionInput = z.infer<typeof ApproveQuestionDto>
