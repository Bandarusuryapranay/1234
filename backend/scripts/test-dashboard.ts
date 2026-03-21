import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function test() {
  try {
    const recruiterUserId = 'some-real-id' // I need a real ID or just a mock
    // Find any recruiter
    const recruiter = await prisma.recruiterProfile.findFirst()
    if (!recruiter) {
      console.log('No recruiter found')
      return
    }
    
    const assignments = await prisma.campaignRecruiter.findMany({
      where: { recruiterId: recruiter.id },
      select: { campaignId: true },
    })
    const campaignIds = assignments.map(a => a.campaignId)
    console.log('Campaign IDs:', campaignIds)

    const [total, active, pending, completed, shortlisted, recent] = await Promise.all([
      prisma.candidateProfile.count({ where: { campaignId: { in: campaignIds } } }),
      prisma.candidateProfile.count({ where: { campaignId: { in: campaignIds }, status: 'IN_PROGRESS' } }),
      prisma.candidateProfile.count({ where: { campaignId: { in: campaignIds }, status: { in: ['LOCKED', 'INVITED', 'ONBOARDING', 'READY'] } } }),
      prisma.candidateProfile.count({ where: { campaignId: { in: campaignIds }, status: 'COMPLETED' } }),
      prisma.candidateProfile.count({ where: { campaignId: { in: campaignIds }, status: 'SHORTLISTED' } }),
      prisma.candidateProfile.findMany({
        where: { campaignId: { in: campaignIds } },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          campaign: { select: { name: true, role: true } },
          scorecard: { select: { technicalFitPercent: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 5
      })
    ])

    console.log('Stats:', { total, active, pending, completed, shortlisted })
  } catch (err) {
    console.error('Error in getDashboardStats:', err)
  } finally {
    await prisma.$disconnect()
  }
}

test()
