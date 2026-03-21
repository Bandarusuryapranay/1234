import { z } from 'zod'

export const LoginDto = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
})

export const RefreshDto = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
})

export const ChangePasswordDto = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
})

export const ForgotPasswordDto = z.object({
  email: z.string().email('Invalid email'),
})

export type LoginInput         = z.infer<typeof LoginDto>
export type RefreshInput        = z.infer<typeof RefreshDto>
export type ChangePasswordInput = z.infer<typeof ChangePasswordDto>
