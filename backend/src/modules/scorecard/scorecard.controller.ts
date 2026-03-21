import type { Request, Response, NextFunction } from 'express'
import * as ScorecardService from './scorecard.service'
import * as ReportService    from './report.service'
import { prisma }            from '../../lib/prisma'
import { forwardScorecardToAdmin } from '../admin/advance-round.service'

export async function generate(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(await ScorecardService.generateScorecard(req.params.candidateId))
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

// GET /api/scorecard/:candidateId/download  — stream PDF
export async function downloadReport(req: Request, res: Response, next: NextFunction) {
  try {
    const candidateId = req.params.candidateId

    const candidate = await prisma.candidateProfile.findUniqueOrThrow({
      where: { id: candidateId },
      include: {
        user:      { select: { firstName: true, lastName: true, email: true } },
        campaign:  { select: { name: true, role: true } },
        scorecard: true,
        strikeLog: { orderBy: { occurredAt: 'asc' } },
      },
    })

    if (!candidate.scorecard) {
      return res.status(400).json({ error: 'Scorecard not generated yet. Run /generate first.' })
    }

    const sc = candidate.scorecard as any

    const pdfStream = await ReportService.generateReportPDF({
      candidate: candidate.user,
      campaign:  candidate.campaign,
      scorecard: {
        technicalFitPercent: sc.technicalFitPercent,
        trustScore:          sc.trustScore,
        roundScores:         sc.roundScores || [],
        gapAnalysis:         sc.gapAnalysis,
        recruiterNotes:      sc.recruiterNotes,
        recruiterRating:     sc.recruiterRating,
        generatedAt:         sc.generatedAt,
      },
      strikeLog: candidate.strikeLog,
    })

    const filename = `smarthire_${candidate.user.firstName}_${candidate.user.lastName}_report.pdf`
      .replace(/\s+/g, '_').toLowerCase()

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    pdfStream.pipe(res)
  } catch (err) { next(err) }
}

// POST /api/scorecard/:candidateId/forward-to-admin
export async function forwardToAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await forwardScorecardToAdmin(req.params.candidateId, req.user!.userId)
    res.json(result)
  } catch (err) { next(err) }
}

// GET /api/scorecard/campaign/:campaignId/export-excel
export async function exportExcel(req: Request, res: Response, next: NextFunction) {
  try {
    const { generateCampaignExcel } = await import('./excel.service')
    const buffer = await generateCampaignExcel(req.params.campaignId)

    const campaign = await prisma.campaign.findUniqueOrThrow({
      where: { id: req.params.campaignId },
      select: { name: true },
    })

    const filename = `smarthire_${campaign.name}_results.xlsx`
      .replace(/\s+/g, '_').toLowerCase()

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buffer)
  } catch (err) { next(err) }
}