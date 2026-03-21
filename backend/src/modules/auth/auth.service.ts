import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  blacklistToken,
  isTokenBlacklisted,
} from '../../lib/jwt'
import type { LoginInput, ChangePasswordInput } from './auth.dto'

// ─── Login ────────────────────────────────────────────────────

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    include: {
      candidateProfile: {
        select: { id: true, status: true, campaignId: true },
      },
    },
  })

  if (!user || !user.isActive) {
    console.log(`[Auth:Login] User not found or inactive: ${input.email}`)
    throw { status: 401, message: 'Invalid email or password' }
  }

  // Candidate locked — recruiter has not granted permission yet
  if (user.role === 'CANDIDATE' && user.candidateProfile?.status === 'LOCKED') {
    throw { status: 403, message: 'Your account has not been activated yet. Please wait for the recruiter to grant access.', code: 'CANDIDATE_LOCKED' }
  }

  // Candidate terminated — session was killed by watcher
  if (user.role === 'CANDIDATE' && user.candidateProfile?.status === 'TERMINATED') {
    throw { status: 403, message: 'Your session was terminated due to proctoring violations.', code: 'CANDIDATE_TERMINATED' }
  }

  const passwordMatch = await bcrypt.compare(input.password, user.passwordHash)
  if (!passwordMatch) {
    console.log(`[Auth:Login] Password mismatch for: ${input.email}`)
    throw { status: 401, message: 'Invalid email or password' }
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  // If candidate is INVITED (first login) → move to ONBOARDING
  if (user.role === 'CANDIDATE' && user.candidateProfile?.status === 'INVITED') {
    await prisma.candidateProfile.update({
      where: { id: user.candidateProfile.id },
      data: { status: 'ONBOARDING' },
    })
  }

  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    candidateId: user.candidateProfile?.id,
  })

  const refreshToken = signRefreshToken(user.id)

  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      candidateStatus: user.candidateProfile?.status ?? null,
      candidateId: user.candidateProfile?.id ?? null,
      campaignId: user.candidateProfile?.campaignId ?? null,
    },
  }
}

// ─── Refresh Access Token ─────────────────────────────────────

export async function refreshAccessToken(refreshToken: string) {
  // Check blacklist
  if (await isTokenBlacklisted(refreshToken)) {
    throw { status: 401, message: 'Token has been revoked' }
  }

  // Verify signature
  let payload: { sub: string }
  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    throw { status: 401, message: 'Invalid or expired refresh token' }
  }

  // Check DB
  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
  })

  if (!stored || stored.expiresAt < new Date()) {
    throw { status: 401, message: 'Refresh token expired. Please log in again.' }
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: payload.sub },
    include: { candidateProfile: { select: { id: true } } },
  })

  const newAccessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    candidateId: user.candidateProfile?.id,
  })

  return { accessToken: newAccessToken }
}

// ─── Logout ───────────────────────────────────────────────────

export async function logout(userId: string, accessToken: string, refreshToken?: string) {
  // Blacklist access token
  await blacklistToken(accessToken, userId, 'LOGOUT')

  // Delete refresh token from DB
  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
  }

  // Log it
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: 'USER_LOGOUT',
      entityType: 'User',
      entityId: userId,
    },
  })
}

// ─── Change Password ──────────────────────────────────────────

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
  currentToken: string
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash)
  if (!valid) {
    throw { status: 400, message: 'Current password is incorrect' }
  }

  if (input.currentPassword === input.newPassword) {
    throw { status: 400, message: 'New password must be different from current password' }
  }

  const newHash = await bcrypt.hash(input.newPassword, 12)

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash, mustChangePassword: false },
  })

  // Blacklist current token — force re-login with new password
  await blacklistToken(currentToken, userId, 'PASSWORD_CHANGE')

  // Invalidate all existing refresh tokens for this user
  await prisma.refreshToken.deleteMany({ where: { userId } })

  // If candidate — advance status from ONBOARDING to READY (if resume already uploaded)
  const candidate = await prisma.candidateProfile.findUnique({ where: { userId } })
  if (candidate && candidate.status === 'ONBOARDING' && candidate.resumeUrl) {
    await prisma.candidateProfile.update({
      where: { id: candidate.id },
      data: { status: 'READY' },
    })
  }

  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: userId,
    },
  })
}

// ─── Get Current User ─────────────────────────────────────────

export async function getMe(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      mustChangePassword: true,
      lastLoginAt: true,
      candidateProfile: {
        select: {
          id: true,
          status: true,
          campaignId: true,
          resumeUrl: true,
          campaign: { select: { name: true, role: true } },
        },
      },
      recruiterProfile: {
        select: {
          id: true,
          department: true,
          assignments: {
            select: { campaign: { select: { id: true, name: true, status: true } } },
          },
        },
      },
      adminProfile: {
        select: { id: true, department: true },
      },
    },
  })

  return user
}
