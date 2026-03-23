import type { Request, Response, NextFunction } from 'express'
import * as ScorecardService from './scorecard.service'
import * as ReportService    from './report.service'
import { prisma }            from '../../lib/prisma'
import { forwardScorecardToAdmin } from '../admin/advance-round.service'
import { gapAnalysisQueue }  from '../../jobs/queue'
import https from 'https'

// ── Fetch image buffer from a URL (for candidate photo in PDF) ─
function fetchPhotoBuffer(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return }
    try {
      const req = https.get(url, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
        res.on('error', () => resolve(null))
      })
      req.on('error', () => resolve(null))
      req.setTimeout(5000, () => { req.destroy(); resolve(null) })
    } catch { resolve(null) }
  })
}

// FIX 7: queue gap analysis instead of blocking HTTP for 30-60s
export async function generate(req: Request, res: Response, next: NextFunction) {
  try {
    const { candidateId } = req.params

    // Check if already generated recently
    const existing = await prisma.scoreCard.findUnique({ where: { candidateId } })
    if (existing?.generatedAt) {
      const ageMs = Date.now() - new Date(existing.generatedAt).getTime()
      if (ageMs < 60 * 1000) {
        return res.json({ ...existing, message: 'Using recent scorecard (generated < 1 min ago)' })
      }
    }

    // Push to background queue
    await gapAnalysisQueue.add('analyze', { candidateId })
    res.json({ message: 'Scorecard generation started. Refresh in 30-60 seconds.', queued: true })
  } catch (err) { next(err) }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await ScorecardService.getScorecard(req.params.candidateId))
  } catch (err) { next(err) }
}

export async function addNote(req: Request, res: Response, next: NextFunction) {
  try {
    const { note, rating } = req.body
    res.json(await ScorecardService.addRecruiterNote(req.params.candidateId, note, rating))
  } catch (err) { next(err) }
}

export async function downloadReport(req: Request, res: Response, next: NextFunction) {
  try {
    const candidateId = req.params.candidateId
    const candidate   = await prisma.candidateProfile.findUniqueOrThrow({
      where:   { id: candidateId },
      include: {
        user:      { select: { firstName: true, lastName: true, email: true } },
        campaign:  { select: { name: true, role: true } },
        scorecard: true,
        strikeLog: { orderBy: { occurredAt: 'asc' } },
        // enrollmentPhotoUrl is a direct field on CandidateProfile — no include needed
        // Fetch attempts with round info + interview answers for PDF
        attempts: {
          where:   { status: 'COMPLETED' },
          include: {
            round: { select: { roundType: true, passMarkPercent: true, order: true } },
            interviewAnswers: {
              include: { question: { select: { prompt: true } } },
              orderBy: { answeredAt: 'asc' },
            },
          },
          orderBy: { startedAt: 'asc' },
        },
      },
    })

    if (!candidate.scorecard) {
      return res.status(400).json({ error: 'Scorecard not generated yet. Run /generate first.' })
    }

    const sc = candidate.scorecard as any

    // Build enriched round scores with pass mark + timestamps
    const enrichedRoundScores = (sc.roundScores || []).map((rs: any) => {
      const attempt = (candidate as any).attempts?.find((a: any) => a.roundId === rs.roundId)
      return {
        ...rs,
        roundType:       attempt?.round?.roundType      || rs.roundType      || '—',
        roundOrder:      attempt?.round?.order          || rs.roundOrder      || 0,
        passMarkPercent: attempt?.round?.passMarkPercent ?? rs.passMarkPercent ?? 60,
        startedAt:       attempt?.startedAt,
        completedAt:     attempt?.completedAt,
      }
    })

    // Build interview answer previews for PDF
    const interviewPreviews: any[] = []
    for (const attempt of (candidate as any).attempts || []) {
      for (const ia of attempt.interviewAnswers || []) {
        interviewPreviews.push({
          prompt:        ia.question?.prompt || '',
          answerPreview: (ia.textAnswer || ia.sttTranscript || '').slice(0, 200),
          aiScore:       ia.aiScore,
          deliveryScore: ia.deliveryScore,
          wordsPerMinute:ia.wordsPerMinute,
          fillerWordRatio:ia.fillerWordRatio,
          durationSeconds:ia.durationSeconds,
          mode:          ia.mode,
        })
      }
    }

    // Fetch photo buffer before generating PDF
    const candidatePhoto = candidate.enrollmentPhotoUrl
      ? await fetchPhotoBuffer(candidate.enrollmentPhotoUrl)
      : null

    const stream = ReportService.generateReportPDF({
      candidate:     candidate.user,
      candidatePhoto,
      campaign:           candidate.campaign,
      scorecard: {
        technicalFitPercent: sc.technicalFitPercent,
        trustScore:          sc.trustScore,
        roundScores:         enrichedRoundScores,
        gapAnalysis:         sc.gapAnalysis,
        recruiterNotes:      sc.recruiterNotes,
        recruiterRating:     sc.recruiterRating,
        generatedAt:         sc.generatedAt,
      },
      strikeLog:           candidate.strikeLog,
      interviewPreviews,
    })

    const filename = `smarthire_${candidate.user.firstName}_${candidate.user.lastName}_report.pdf`.replace(/\s+/g, '_').toLowerCase()
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    stream.pipe(res)
  } catch (err) { next(err) }
}

export async function forwardToAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await forwardScorecardToAdmin(req.params.candidateId, req.user!.userId))
  } catch (err) { next(err) }
}

export async function exportExcel(req: Request, res: Response, next: NextFunction) {
  try {
    const { generateCampaignExcel } = await import('./excel.service')
    const buffer   = await generateCampaignExcel(req.params.campaignId)
    const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: req.params.campaignId }, select: { name: true } })
    const filename = `smarthire_${campaign.name}_results.xlsx`.replace(/\s+/g, '_').toLowerCase()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buffer)
  } catch (err) { next(err) }
}