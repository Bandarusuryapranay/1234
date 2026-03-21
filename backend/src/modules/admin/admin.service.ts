import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma'
import { generateTempPassword } from '../../utils/password.util'
import { sendRecruiterCredentials } from '../email/email.service'

export async function createRecruiter(input: {
  email: string, firstName: string, lastName: string, department?: string, campaignIds?: string[]
}) {
  const tempPassword = generateTempPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 12)

  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash,
      role: 'RECRUITER',
      mustChangePassword: true,
      recruiterProfile: {
        create: {
          department: input.department,
          assignments: {
            create: (input.campaignIds || []).map((cid) => ({ campaignId: cid })),
          },
        },
      },
    },
    include: { recruiterProfile: true },
  })

  await prisma.auditLog.create({
    data: { action: 'RECRUITER_CREATED', entityType: 'User', entityId: user.id },
  })

  // ── Send Email ──────────────────────────────────────────────
  try {
    const loginUrl = `${process.env.FRONTEND_URL}/login`
    await sendRecruiterCredentials({
      toEmail: input.email,
      firstName: input.firstName,
      tempPassword,
      loginUrl,
    })
  } catch (err) {
    console.error('[AdminService] Failed to send recruiter email:', err)
    // We don't throw here to avoid rolling back the creation, but logging is critical
  }

  return { ...user, tempPassword, passwordHash: undefined }
}

export async function getAllRecruiters() {
  return prisma.user.findMany({
    where: { role: 'RECRUITER' },
    include: {
      recruiterProfile: {
        include: {
          assignments: { include: { campaign: { select: { id: true, name: true, status: true } } } },
        },
      },
    },
  })
}

export async function getDashboardStats(adminUserId: string) {
  const admin = await prisma.adminProfile.findUniqueOrThrow({ where: { userId: adminUserId } })

  const [
    totalCampaigns, 
    activeCampaigns, 
    totalCandidates, 
    terminated,
    funnelData,
    proctoringSummary,
    pendingDecisionsRaw
  ] = await Promise.all([
    prisma.campaign.count({ where: { adminId: admin.id, NOT: { status: 'ARCHIVED' } } }),
    prisma.campaign.count({ where: { adminId: admin.id, status: 'ACTIVE' } }),
    prisma.candidateProfile.count({ where: { campaign: { adminId: admin.id, NOT: { status: 'ARCHIVED' } } } }),
    prisma.candidateProfile.count({ where: { campaign: { adminId: admin.id, NOT: { status: 'ARCHIVED' } }, status: 'TERMINATED' } }),
    
    // Funnel Aggregates
    prisma.candidateProfile.groupBy({
      by: ['status'],
      where: { campaign: { adminId: admin.id } },
      _count: { _all: true }
    }),

    // Proctoring Aggregates
    prisma.strikeEvent.count({
      where: { candidate: { campaign: { adminId: admin.id } } }
    }),

    prisma.pipelineRound.findMany({
      where: { failAction: 'MANUAL_REVIEW', campaign: { adminId: admin.id } },
      select: { id: true }
    })
  ])

  const manualReviewRoundIds = (pendingDecisionsRaw as any[]).map(r => r.id)

  const pendingDecisions = await prisma.candidateProfile.findMany({
    where: {
      campaign: { adminId: admin.id },
      status: { not: 'REJECTED' },
      OR: [
        { isForwarded: true },
        {
          status: 'COMPLETED',
          attempts: {
            some: {
              passed: false,
              roundId: { in: manualReviewRoundIds }
            }
          }
        }
      ]
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
      campaign: { select: { name: true } },
      scorecard: { select: { technicalFitPercent: true } },
      attempts: {
        where: { passed: false, roundId: { in: manualReviewRoundIds } },
        include: { round: { select: { order: true, passMarkPercent: true } } },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  })

  // Format Funnel for Charts
  const funnelMap: Record<string, number> = {}
  funnelData.forEach(item => { funnelMap[item.status] = item._count._all })

  return {
    totalCampaigns,
    activeCampaigns,
    totalCandidates,
    terminated,
    totalStrikes: proctoringSummary,
    funnel: {
      invited: (funnelMap['INVITED'] || 0) + (funnelMap['LOCKED'] || 0),
      inProgress: (funnelMap['IN_PROGRESS'] || 0) + (funnelMap['ONBOARDING'] || 0) + (funnelMap['READY'] || 0),
      completed: funnelMap['COMPLETED'] || 0,
      shortlisted: funnelMap['SHORTLISTED'] || 0,
      rejected: funnelMap['REJECTED'] || 0,
      terminated: funnelMap['TERMINATED'] || 0
    },
    pendingDecisions: (pendingDecisions as any[]).map((c: any) => {
      const lastFail = c.attempts[0]
      return {
        candidateId: c.id,
        name: `${c.user?.firstName} ${c.user?.lastName}`,
        campaignName: c.campaign?.name,
        roundOrder: lastFail?.round?.order,
        percentScore: lastFail?.percentScore ?? c.scorecard?.technicalFitPercent,
        passMarkPercent: lastFail?.round?.passMarkPercent,
        reason: c.isForwarded ? 'Forwarded for Review' : `Failed Round ${lastFail?.round?.order}`
      }
    })
  }
}

export async function getRecruiterById(recruiterId: string) {
  return prisma.user.findUniqueOrThrow({
    where: { id: recruiterId, role: 'RECRUITER' },
    include: {
      recruiterProfile: {
        include: {
          assignments: {
            include: {
              campaign: {
                select: { id: true, name: true, role: true, status: true, _count: { select: { candidates: true } } }
              }
            }
          },
        },
      },
    },
  })
}

export async function updateRecruiter(recruiterId: string, data: { department?: string; isActive?: boolean }) {
  if (data.isActive !== undefined) {
    await prisma.user.update({
      where: { id: recruiterId },
      data: { isActive: data.isActive }
    })
  }

  if (data.department !== undefined) {
    await prisma.recruiterProfile.update({
      where: { userId: recruiterId },
      data: { department: data.department }
    })
  }

  return getRecruiterById(recruiterId)
}

export async function removeRecruiterFromCampaign(recruiterId: string, campaignId: string) {
  const profile = await prisma.recruiterProfile.findUniqueOrThrow({ where: { userId: recruiterId } })
  await prisma.campaignRecruiter.deleteMany({
    where: { recruiterId: profile.id, campaignId }
  })
  return { ok: true }
}

export async function deleteRecruiter(recruiterId: string) {
  // 1. Find profile to delete assignments first (Prisma CASCADE will handle most, but explicit is safer)
  const profile = await prisma.recruiterProfile.findUnique({ where: { userId: recruiterId } })

  if (profile) {
    await prisma.campaignRecruiter.deleteMany({ where: { recruiterId: profile.id } })
    await prisma.recruiterProfile.delete({ where: { id: profile.id } })
  }

  // 2. Delete the user
  return prisma.user.delete({ where: { id: recruiterId } })
}

