import { z } from 'zod'
import { CreateCampaignDto } from './campaign.dto'
import { prisma } from '../../lib/prisma'
import type { CreateCampaignInput, UpdateCampaignStatusInput } from './campaign.dto'
//import type { PipelineConfig } from '@smarthire/shared-types'
export async function createCampaign(adminUserId: string, input: CreateCampaignInput) {
  const admin = await prisma.adminProfile.findUniqueOrThrow({ where: { userId: adminUserId } })

  const campaign = await prisma.campaign.create({
    data: {
      name:           input.name,
      role:           input.role,
      department:     input.department,
      jobDescription: input.jobDescription,
      expiresAt:      input.expiresAt ? new Date(input.expiresAt) : null,
      maxCandidates:  input.maxCandidates,
      pipelineConfig: input.pipelineConfig,
      adminId:        admin.id,
      status:         'DRAFT',
    },
  })

  // Create ordered PipelineRound records
  await prisma.pipelineRound.createMany({
    data: input.pipelineConfig.rounds.map((r) => ({
      campaignId:       campaign.id,
      order:            r.order,
      roundType:        r.roundType,
      roundConfig:      r,
      interviewMode:    (r as any).interviewMode ?? null,
      timerMode:        (r as any).timerMode ?? 'SHARED',
      timeLimitMinutes: r.timeLimitMinutes ?? null,
      passMarkPercent:  r.passMarkPercent ?? null,
      failAction:       r.failAction ?? 'MANUAL_REVIEW',
    })),
  })

  await prisma.auditLog.create({
    data: { actorId: adminUserId, actorRole: 'ADMIN', action: 'CAMPAIGN_CREATED', entityType: 'Campaign', entityId: campaign.id },
  })

  return campaign
}

export async function updateCampaign(id: string, input: z.infer<typeof CreateCampaignDto>, adminUserId: string) {
  const admin = await prisma.adminProfile.findUniqueOrThrow({ where: { userId: adminUserId } })

  const campaign = await prisma.campaign.update({
    where: { id, adminId: admin.id },
    data: {
      name:           input.name,
      role:           input.role,
      department:     input.department,
      jobDescription: input.jobDescription,
      expiresAt:      input.expiresAt ? new Date(input.expiresAt) : null,
      maxCandidates:  input.maxCandidates,
      pipelineConfig: input.pipelineConfig,
    },
  })

  // Only re-create the rounds if no candidate has started an attempt yet.
  // This prevents breaking foreign keys and protects existing data on active campaigns.
  const attemptCount = await prisma.candidateAttempt.count({ where: { round: { campaignId: id } } })
  
  if (attemptCount === 0) {
    await prisma.pipelineRound.deleteMany({ where: { campaignId: id } })
    await prisma.pipelineRound.createMany({
      data: input.pipelineConfig.rounds.map((r) => ({
        campaignId:       id,
        order:            r.order,
        roundType:        r.roundType,
        roundConfig:      r,
        interviewMode:    (r as any).interviewMode ?? null,
        timerMode:        (r as any).timerMode ?? 'SHARED',
        timeLimitMinutes: r.timeLimitMinutes ?? null,
        passMarkPercent:  r.passMarkPercent ?? null,
        failAction:       r.failAction ?? 'MANUAL_REVIEW',
      })),
    })
  } else {
    // If attempts exist, we only sync the round configuration (not re-creating records)
    // This allows updating time limits or pass marks without resetting progress.
    for (const r of input.pipelineConfig.rounds) {
      // Find round by campaignId and order? Or type? Since order/type describe the round.
      await prisma.pipelineRound.updateMany({
        where: { campaignId: id, order: r.order, roundType: r.roundType },
        data: {
          roundConfig:      r,
          timeLimitMinutes: r.timeLimitMinutes ?? null,
          passMarkPercent:  r.passMarkPercent ?? null,
        }
      })
    }
  }

  await prisma.auditLog.create({
    data: { actorId: adminUserId, actorRole: 'ADMIN', action: 'CAMPAIGN_UPDATED', entityType: 'Campaign', entityId: id },
  })

  return campaign
}

export async function getCampaigns(adminUserId: string) {
  const admin = await prisma.adminProfile.findUniqueOrThrow({ where: { userId: adminUserId } })
  return prisma.campaign.findMany({
    where: { adminId: admin.id, NOT: { status: 'ARCHIVED' } },
    include: {
      _count: { select: { candidates: true } },
      rounds: { orderBy: { order: 'asc' } },
      recruiters: { include: { recruiter: { include: { user: { select: { firstName: true, lastName: true, email: true } } } } } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getCampaignById(id: string) {
  return prisma.campaign.findUniqueOrThrow({
    where: { id },
    include: {
      rounds: { orderBy: { order: 'asc' }, include: { questionPool: true } },
      recruiters: { include: { recruiter: { include: { user: { select: { firstName: true, lastName: true, email: true } } } } } },
      _count: { select: { candidates: true } },
    },
  })
}

export async function updateCampaignStatus(id: string, input: UpdateCampaignStatusInput, actorId: string) {
  const campaign = await prisma.campaign.update({
    where: { id },
    data: { status: input.status },
  })
  await prisma.auditLog.create({
    data: { actorId, actorRole: 'ADMIN', action: 'CAMPAIGN_STATUS_UPDATED', entityType: 'Campaign', entityId: id, metadata: { status: input.status } },
  })
  return campaign
}

export async function deleteCampaign(id: string) {
  return prisma.campaign.update({ where: { id }, data: { status: 'ARCHIVED' } })
}

export async function assignRecruiter(campaignId: string, recruiterUserId: string) {
  const recruiter = await prisma.recruiterProfile.findUniqueOrThrow({ where: { userId: recruiterUserId } })
  return prisma.campaignRecruiter.upsert({
    where: { campaignId_recruiterId: { campaignId, recruiterId: recruiter.id } },
    update: {},
    create: { campaignId, recruiterId: recruiter.id },
  })
}
