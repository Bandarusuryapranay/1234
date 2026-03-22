import { z } from 'zod'

export const GeneratePoolDto = z.object({
  campaignId: z.string().uuid(),
})

export const ApproveQuestionDto = z.object({
  questionId: z.string().uuid(),
  approved:   z.boolean(),
})

export const BulkApproveDto = z.object({
  poolId:  z.string().uuid(),
  approve: z.boolean(), // true = approve all, false = reject all
})

export type GeneratePoolInput    = z.infer<typeof GeneratePoolDto>
export type ApproveQuestionInput = z.infer<typeof ApproveQuestionDto>
export type BulkApproveInput     = z.infer<typeof BulkApproveDto>