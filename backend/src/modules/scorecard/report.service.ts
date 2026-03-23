import PDFDocument from 'pdfkit'
import type { Readable } from 'stream'

// ── Brand colours ─────────────────────────────────────────────
const ORANGE  = '#FB851E'
const NAVY    = '#1E2A3A'
const TEAL    = '#23979C'
const GREEN   = '#27AE60'
const RED     = '#E74C3C'
const AMBER   = '#E67E22'
const GRAY    = '#64748B'
const LGRAY   = '#94A3B8'
const DARK    = '#0F172A'
const WHITE   = '#FFFFFF'
const LIGHT   = '#F8FAFC'
const BORDER  = '#E2E8F0'
const BG2     = '#F1F5F9'

// ── Confidence score from delivery metrics ────────────────────
function computeConfidenceScore(wpm: number | null, fillerRatio: number | null, silenceRatio: number | null, duration: number | null): number {
  if (!wpm && !fillerRatio) return 0
  let score = 10
  const w = wpm || 0
  const f = fillerRatio || 0
  const s = silenceRatio || 0
  const d = duration || 0
  if (w < 80)        score -= 3
  else if (w < 110)  score -= 1.5
  else if (w > 190)  score -= 2
  else if (w > 165)  score -= 0.5
  if (f > 0.20)      score -= 3
  else if (f > 0.12) score -= 1.5
  else if (f > 0.06) score -= 0.5
  if (s > 0.55)      score -= 2
  else if (s > 0.35) score -= 1
  if (d > 0 && d < 20) score -= 2
  return Math.max(0, Math.min(10, score))
}

function confidenceLabel(score: number): { label: string; color: string } {
  if (score >= 8)  return { label: 'HIGH CONFIDENCE',    color: GREEN }
  if (score >= 6)  return { label: 'GOOD',               color: TEAL }
  if (score >= 4)  return { label: 'MODERATE',           color: AMBER }
  return                  { label: 'LOW CONFIDENCE',     color: RED }
}

// ── Hire recommendation ────────────────────────────────────────
function classifyRecommendation(fitPct: number, trustScore: number) {
  if (fitPct >= 80 && trustScore >= 80) return { label: 'STRONG HIRE', color: WHITE, bg: GREEN  }
  if (fitPct >= 65 && trustScore >= 65) return { label: 'HIRE',        color: WHITE, bg: TEAL   }
  if (fitPct >= 50 && trustScore >= 50) return { label: 'BORDERLINE',  color: WHITE, bg: AMBER  }
  return                                       { label: 'NO HIRE',     color: WHITE, bg: RED    }
}

// ── Interfaces ────────────────────────────────────────────────
export interface InterviewPreview {
  prompt:           string
  answerPreview:    string
  aiScore?:         number | null
  deliveryScore?:   number | null
  wordsPerMinute?:  number | null
  fillerWordRatio?: number | null
  silenceRatio?:    number | null
  durationSeconds?: number | null
  fillerWordCount?: number | null
  wordCount?:       number | null
  mode:             string
}

export interface ReportData {
  candidate: { firstName: string; lastName: string; email: string }
  candidatePhoto?: Buffer | null
  campaign:  { name: string; role: string }
  scorecard: {
    technicalFitPercent?: number
    trustScore?:          number
    roundScores:          any[]
    gapAnalysis?:         any
    recruiterNotes?:      string
    recruiterRating?:     number
    generatedAt?:         string
  }
  strikeLog:         any[]
  interviewPreviews: InterviewPreview[]
}

// ── Helpers ───────────────────────────────────────────────────
function ph(doc: any) { return doc.page.height }
function pw(doc: any) { return doc.page.width  }
const MARGIN = 45
function contentW(doc: any) { return pw(doc) - MARGIN * 2 }

function pageCheck(doc: any, needed = 60) {
  if (doc.y + needed > ph(doc) - 55) doc.addPage()
}

function hRule(doc: any, color = BORDER) {
  doc.moveTo(MARGIN, doc.y).lineTo(pw(doc) - MARGIN, doc.y).lineWidth(0.5).stroke(color)
}

function sectionTitle(doc: any, title: string) {
  pageCheck(doc, 40)
  doc.moveDown(0.4)
  // Orange accent bar
  doc.rect(MARGIN, doc.y, 4, 15).fill(ORANGE)
  doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold')
     .text(title, MARGIN + 10, doc.y + 1, { width: contentW(doc) - 10 })
  doc.moveDown(0.15)
  hRule(doc, BORDER)
  doc.moveDown(0.35)
}

function pill(doc: any, x: number, y: number, w: number, h: number, text: string, bg: string, fg = WHITE) {
  doc.rect(x, y, w, h).fill(bg)
  doc.fillColor(fg).fontSize(8).font('Helvetica-Bold')
     .text(text, x, y + (h - 8) / 2 + 1, { width: w, align: 'center' })
}

function scoreBar(doc: any, x: number, y: number, w: number, h: number, pct: number, passMark: number, color: string) {
  // Background
  doc.rect(x, y, w, h).fill(BG2)
  // Fill
  const fill = Math.min(w, (Math.max(0, pct) / 100) * w)
  if (fill > 0) doc.rect(x, y, fill, h).fill(color)
  // Pass mark line
  const pmX = x + (passMark / 100) * w
  doc.moveTo(pmX, y - 2).lineTo(pmX, y + h + 2).lineWidth(1).stroke(LGRAY)
  // Pass mark label
  doc.fillColor(LGRAY).fontSize(6.5).font('Helvetica')
     .text(`${passMark}%`, pmX - 8, y + h + 3, { width: 20, align: 'center' })
}

// ── Main PDF generator (sync) ─────────────────────────────────
export function generateReportPDF(data: ReportData): Readable {
  const doc = new PDFDocument({ margin: MARGIN, size: 'A4', autoFirstPage: true, bufferPages: true })

  const fitPct  = data.scorecard.technicalFitPercent ?? 0
  const trust   = data.scorecard.trustScore ?? 0
  const strikes = data.strikeLog.filter((s: any) => s.isStrike).length
  const rec     = classifyRecommendation(fitPct, trust)

  // ════════════════════════════════════════════════════════════
  // HEADER BAND
  // ════════════════════════════════════════════════════════════
  doc.rect(0, 0, pw(doc), 78).fill(NAVY)

  // Logo
  doc.fillColor(ORANGE).fontSize(18).font('Helvetica-Bold').text('SmartHire', MARGIN, 18)
  const logoW = doc.widthOfString('SmartHire') + 2
  doc.fillColor(WHITE).fontSize(18).font('Helvetica').text('AI', MARGIN + logoW, 18)
  doc.fillColor('#94A3B8').fontSize(8).font('Helvetica').text('CANDIDATE ASSESSMENT REPORT', MARGIN, 40)
  doc.fillColor('#64748B').fontSize(7.5).text(
    `Generated: ${data.scorecard.generatedAt ? new Date(data.scorecard.generatedAt).toLocaleString('en-IN') : new Date().toLocaleString('en-IN')}`,
    MARGIN, 52
  )

  // Campaign (top right)
  doc.fillColor(WHITE).fontSize(11).font('Helvetica-Bold')
     .text(data.campaign.name, 0, 22, { align: 'right', width: pw(doc) - MARGIN })
  doc.fillColor('#94A3B8').fontSize(8).font('Helvetica')
     .text(data.campaign.role, 0, 36, { align: 'right', width: pw(doc) - MARGIN })

  doc.y = 88

  // ════════════════════════════════════════════════════════════
  // CANDIDATE INFO + PHOTO
  // ════════════════════════════════════════════════════════════
  const infoY   = doc.y
  const photoW  = 72
  const photoH  = 88
  const photoX  = pw(doc) - MARGIN - photoW

  // Photo
  if (data.candidatePhoto) {
    try {
      doc.rect(photoX - 1, infoY - 1, photoW + 2, photoH + 2).fill(BORDER)
      doc.image(data.candidatePhoto, photoX, infoY, { width: photoW, height: photoH, cover: [photoW, photoH] })
    } catch {
      doc.rect(photoX, infoY, photoW, photoH).fill(BG2)
      doc.fillColor(LGRAY).fontSize(7).text('No Photo', photoX, infoY + photoH / 2 - 4, { width: photoW, align: 'center' })
    }
  } else {
    doc.rect(photoX, infoY, photoW, photoH).fill(BG2).stroke(BORDER)
    doc.fillColor(LGRAY).fontSize(7).text('No Photo', photoX, infoY + photoH / 2 - 4, { width: photoW, align: 'center' })
  }

  // Name + details
  const infoW = photoX - MARGIN - 12
  doc.fillColor(DARK).fontSize(20).font('Helvetica-Bold').text(
    `${data.candidate.firstName} ${data.candidate.lastName}`, MARGIN, infoY, { width: infoW }
  )
  doc.fillColor(GRAY).fontSize(9.5).font('Helvetica').text(data.candidate.email, MARGIN, doc.y + 2, { width: infoW })
  doc.fillColor(LGRAY).fontSize(8.5).text(`${data.campaign.role}  ·  ${data.campaign.name}`, MARGIN, doc.y + 3, { width: infoW })

  doc.y = infoY + photoH + 12

  // ════════════════════════════════════════════════════════════
  // RECOMMENDATION BANNER
  // ════════════════════════════════════════════════════════════
  const bannerY = doc.y
  const bannerH = 42
  doc.rect(MARGIN, bannerY, contentW(doc), bannerH).fill(rec.bg)
  doc.fillColor(WHITE).fontSize(16).font('Helvetica-Bold')
     .text(`AI RECOMMENDATION:  ${rec.label}`, MARGIN, bannerY + (bannerH - 16) / 2, {
       align: 'center', width: contentW(doc),
     })
  doc.y = bannerY + bannerH + 14

  // ════════════════════════════════════════════════════════════
  // THREE SCORE BOXES
  // ════════════════════════════════════════════════════════════
  const boxW  = (contentW(doc) - 20) / 3
  const boxH  = 72
  const boxY  = doc.y
  const boxes = [
    { label: 'Technical Fit',  value: `${fitPct.toFixed(0)}%`, pct: fitPct,  color: fitPct  >= 60 ? GREEN : RED },
    { label: 'Trust Score',    value: `${trust.toFixed(0)}%`,  pct: trust,   color: trust   >= 70 ? GREEN : RED },
    { label: 'Violations',     value: `${strikes}`,            pct: strikes, color: strikes === 0 ? GREEN : strikes >= 2 ? RED : AMBER, isStrikes: true },
  ]

  boxes.forEach((b, i) => {
    const bx = MARGIN + i * (boxW + 10)
    doc.rect(bx, boxY, boxW, boxH).fill(LIGHT).stroke(BORDER)
    doc.rect(bx, boxY, boxW, 3).fill(b.color)
    doc.fillColor(LGRAY).fontSize(8).font('Helvetica').text(b.label, bx + 8, boxY + 8, { width: boxW - 16 })
    doc.fillColor(b.color).fontSize(24).font('Helvetica-Bold').text(b.value, bx + 8, boxY + 20, { width: boxW - 16 })
    // Mini progress bar
    const barW = boxW - 16
    const fill = b.isStrikes ? Math.min(barW, (b.pct / 3) * barW) : Math.min(barW, (b.pct / 100) * barW)
    doc.rect(bx + 8, boxY + 54, barW, 6).fill('#E2E8F0')
    if (fill > 0) doc.rect(bx + 8, boxY + 54, fill, 6).fill(b.color)
  })

  doc.y = boxY + boxH + 16

  // ════════════════════════════════════════════════════════════
  // ASSESSMENT ROUNDS WITH TIMELINE
  // ════════════════════════════════════════════════════════════
  sectionTitle(doc, 'Assessment Rounds')

  const rounds = (data.scorecard.roundScores || [])
    .slice().sort((a: any, b: any) => (a.roundOrder || 0) - (b.roundOrder || 0))

  for (const round of rounds) {
    pageCheck(doc, 55)
    const pct      = round.percentScore ?? round.percent ?? 0
    const passMark = round.passMarkPercent ?? 60
    const passed   = round.passed ?? (pct >= passMark)
    const rowY     = doc.y
    const barX     = MARGIN + 170
    const barW     = 160
    const barH     = 10

    // Round label
    doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold')
       .text(`Round ${round.roundOrder || '?'}  —  ${round.roundType || 'Unknown'}`, MARGIN, rowY + 2, { width: 165 })

    // Score bar
    scoreBar(doc, barX, rowY + 4, barW, barH, pct, passMark, passed ? GREEN : RED)

    // Score %
    doc.fillColor(passed ? GREEN : RED).fontSize(11).font('Helvetica-Bold')
       .text(`${pct.toFixed(1)}%`, barX + barW + 8, rowY + 1, { width: 50 })

    // Pass/Fail pill
    pill(doc, pw(doc) - MARGIN - 42, rowY, 42, 18, passed ? 'PASS' : 'FAIL', passed ? GREEN : RED)

    // Timeline row
    if (round.startedAt || round.completedAt) {
      let timeStr = ''
      if (round.startedAt && round.completedAt) {
        const dur = Math.round((new Date(round.completedAt).getTime() - new Date(round.startedAt).getTime()) / 60000)
        timeStr = `⏱ ${dur} min  ·  Started: ${new Date(round.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}  ·  Finished: ${new Date(round.completedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
      } else if (round.startedAt) {
        timeStr = `Started: ${new Date(round.startedAt).toLocaleString('en-IN')}`
      }
      doc.fillColor(LGRAY).fontSize(7.5).font('Helvetica').text(timeStr, MARGIN, rowY + 20, { width: 340 })
    }

    doc.y = rowY + 34
    hRule(doc, '#F1F5F9')
    doc.moveDown(0.2)
  }

  doc.moveDown(0.4)

  // ════════════════════════════════════════════════════════════
  // AI GAP ANALYSIS
  // ════════════════════════════════════════════════════════════
  if (data.scorecard.gapAnalysis) {
    const gap = data.scorecard.gapAnalysis
    sectionTitle(doc, 'AI Gap Analysis')

    if (gap.aiSummary) {
      pageCheck(doc, 50)
      doc.rect(MARGIN, doc.y, contentW(doc), 2).fill(ORANGE)
      doc.y += 5
      doc.fillColor(DARK).fontSize(10).font('Helvetica-Oblique')
         .text(`"${gap.aiSummary}"`, MARGIN + 8, doc.y, { width: contentW(doc) - 16 })
      doc.moveDown(0.6)
    }

    // Two column layout: strengths left, gaps right
    if (gap.strengths?.length || gap.gaps?.length) {
      pageCheck(doc, 60)
      const colW = (contentW(doc) - 12) / 2
      const colY = doc.y
      let leftH = 0, rightH = 0

      if (gap.strengths?.length) {
        doc.fillColor(GREEN).fontSize(9).font('Helvetica-Bold').text('✓ Strengths', MARGIN, colY)
        let y = colY + 14
        for (const s of gap.strengths.slice(0, 5)) {
          doc.fillColor(DARK).fontSize(8.5).font('Helvetica')
             .text(`• ${s}`, MARGIN + 6, y, { width: colW - 6 })
          y = doc.y + 2
        }
        leftH = y - colY
      }

      if (gap.gaps?.length) {
        const gapX = MARGIN + colW + 12
        doc.fillColor(RED).fontSize(9).font('Helvetica-Bold').text('✗ Skill Gaps', gapX, colY)
        let y = colY + 14
        for (const g of gap.gaps.slice(0, 5)) {
          doc.fillColor(DARK).fontSize(8.5).font('Helvetica')
             .text(`• ${g}`, gapX + 6, y, { width: colW - 6 })
          y = doc.y + 2
        }
        rightH = y - colY
      }

      doc.y = colY + Math.max(leftH, rightH) + 8
    }

    // Skill chips — fixed layout using text not rect
    if (gap.jdMatchedSkills?.length) {
      pageCheck(doc, 30)
      doc.fillColor(GREEN).fontSize(8.5).font('Helvetica-Bold').text('JD Skills Matched:', MARGIN, doc.y)
      doc.moveDown(0.15)
      const matched = gap.jdMatchedSkills.slice(0, 10).join('   •   ')
      doc.fillColor(GREEN).fontSize(8).font('Helvetica').text(matched, MARGIN + 8, doc.y, { width: contentW(doc) - 8 })
      doc.moveDown(0.5)
    }

    if (gap.jdMissingSkills?.length) {
      pageCheck(doc, 30)
      doc.fillColor(RED).fontSize(8.5).font('Helvetica-Bold').text('JD Skills Missing:', MARGIN, doc.y)
      doc.moveDown(0.15)
      const missing = gap.jdMissingSkills.slice(0, 10).join('   •   ')
      doc.fillColor(RED).fontSize(8).font('Helvetica').text(missing, MARGIN + 8, doc.y, { width: contentW(doc) - 8 })
      doc.moveDown(0.5)
    }
  }

  // ════════════════════════════════════════════════════════════
  // INTERVIEW ANSWERS + CONFIDENCE
  // ════════════════════════════════════════════════════════════
  const audioAnswers = data.interviewPreviews.filter(p => p.mode === 'AUDIO' && p.wordsPerMinute != null)
  const textAnswers  = data.interviewPreviews.filter(p => p.answerPreview?.trim())

  if (textAnswers.length > 0 || audioAnswers.length > 0) {
    pageCheck(doc, 60)
    sectionTitle(doc, 'Interview Performance')

    // ── Communication overview (audio only) ──────────────────
    if (audioAnswers.length > 0) {
      const avgWPM      = audioAnswers.reduce((s, a) => s + (a.wordsPerMinute || 0), 0) / audioAnswers.length
      const avgFiller   = audioAnswers.reduce((s, a) => s + (a.fillerWordRatio || 0), 0) / audioAnswers.length
      const avgSilence  = audioAnswers.reduce((s, a) => s + (a.silenceRatio || 0), 0) / audioAnswers.length
      const avgDuration = audioAnswers.reduce((s, a) => s + (a.durationSeconds || 0), 0) / audioAnswers.length
      const confScore   = computeConfidenceScore(avgWPM, avgFiller, avgSilence, avgDuration)
      const confLabel   = confidenceLabel(confScore)

      pageCheck(doc, 70)
      const commY  = doc.y
      const commBg = '#F8FAFC'

      doc.rect(MARGIN, commY, contentW(doc), 62).fill(commBg).stroke(BORDER)
      doc.rect(MARGIN, commY, 4, 62).fill(TEAL)

      // Confidence badge
      doc.rect(MARGIN + 8, commY + 8, 110, 20).fill(confLabel.color)
      doc.fillColor(WHITE).fontSize(8.5).font('Helvetica-Bold')
         .text(`SPEAKER CONFIDENCE: ${confLabel.label}`, MARGIN + 8, commY + 14, { width: 110, align: 'center' })
      doc.fillColor(TEAL).fontSize(22).font('Helvetica-Bold')
         .text(`${confScore.toFixed(1)}/10`, MARGIN + 8, commY + 30, { width: 110, align: 'center' })

      // Metric columns
      const metrics = [
        { label: 'Avg Pace',      value: `${avgWPM.toFixed(0)} wpm`,           note: '120–160 ideal',        color: avgWPM >= 100 && avgWPM <= 180 ? GREEN : AMBER },
        { label: 'Filler Words',  value: `${(avgFiller * 100).toFixed(1)}%`,   note: '<8% excellent',        color: avgFiller < 0.08 ? GREEN : avgFiller < 0.15 ? AMBER : RED },
        { label: 'Silence Ratio', value: `${(avgSilence * 100).toFixed(0)}%`,  note: '<35% comfortable',     color: avgSilence < 0.35 ? GREEN : avgSilence < 0.55 ? AMBER : RED },
        { label: 'Avg Duration',  value: `${avgDuration.toFixed(0)}s / ans`,   note: '>30s recommended',     color: avgDuration >= 30 ? GREEN : AMBER },
      ]

      metrics.forEach((m, i) => {
        const mx = MARGIN + 128 + i * 98
        doc.fillColor(LGRAY).fontSize(7.5).font('Helvetica').text(m.label, mx, commY + 8, { width: 90 })
        doc.fillColor(m.color).fontSize(13).font('Helvetica-Bold').text(m.value, mx, commY + 20, { width: 90 })
        doc.fillColor(LGRAY).fontSize(6.5).font('Helvetica').text(m.note, mx, commY + 36, { width: 90 })
      })

      doc.y = commY + 70
    }

    // ── Per-answer breakdown ─────────────────────────────────
    if (textAnswers.length > 0) {
      doc.moveDown(0.3)
      doc.fillColor(GRAY).fontSize(8.5).font('Helvetica-Bold').text('Answer Breakdown', MARGIN, doc.y)
      doc.moveDown(0.3)

      for (const ia of textAnswers.slice(0, 5)) {
        pageCheck(doc, 55)
        const aY = doc.y

        // Question
        doc.fillColor(TEAL).fontSize(8).font('Helvetica-Bold')
           .text('Q ', MARGIN, aY, { continued: true })
        doc.fillColor(DARK).font('Helvetica')
           .text((ia.prompt || '').slice(0, 130) + ((ia.prompt || '').length > 130 ? '...' : ''), { width: contentW(doc) - 60 })

        // Answer preview
        if (ia.answerPreview) {
          doc.fillColor(GRAY).fontSize(8).font('Helvetica-Oblique')
             .text(`"${ia.answerPreview.slice(0, 180)}${ia.answerPreview.length > 180 ? '...' : ''}"`,
               MARGIN + 10, doc.y + 2, { width: contentW(doc) - 70 })
        }

        // Scores row
        const scoreRowY = doc.y + 4
        const scores: {label: string; val: string; color: string}[] = []
        if (ia.aiScore != null) {
          const c = ia.aiScore >= 7 ? GREEN : ia.aiScore >= 5 ? AMBER : RED
          scores.push({ label: 'Content', val: `${ia.aiScore.toFixed(1)}/10`, color: c })
        }
        if (ia.mode === 'AUDIO') {
          const confS = computeConfidenceScore(ia.wordsPerMinute || null, ia.fillerWordRatio || null, ia.silenceRatio || null, ia.durationSeconds || null)
          const confC = confidenceLabel(confS)
          scores.push({ label: 'Confidence', val: `${confS.toFixed(1)}/10`, color: confC.color })
          if (ia.wordsPerMinute) scores.push({ label: 'Pace', val: `${ia.wordsPerMinute.toFixed(0)} wpm`, color: LGRAY })
          if (ia.fillerWordCount != null) scores.push({ label: 'Fillers', val: `${ia.fillerWordCount}`, color: LGRAY })
        }

        let sx = MARGIN + 10
        for (const sc of scores) {
          doc.fillColor(LGRAY).fontSize(6.5).font('Helvetica').text(sc.label, sx, scoreRowY, { width: 60 })
          doc.fillColor(sc.color).fontSize(8.5).font('Helvetica-Bold').text(sc.val, sx, scoreRowY + 8, { width: 60 })
          sx += 68
        }

        doc.y = Math.max(doc.y, scoreRowY + 20) + 4
        hRule(doc, '#F1F5F9')
        doc.moveDown(0.2)
      }
    }
  }

  // ════════════════════════════════════════════════════════════
  // PROCTORING VIOLATIONS
  // ════════════════════════════════════════════════════════════
  if (data.strikeLog.length > 0) {
    pageCheck(doc, 50)
    sectionTitle(doc, 'Proctoring Violations')

    for (const strike of data.strikeLog) {
      pageCheck(doc, 22)
      const color = strike.isStrike ? RED : AMBER
      const label = strike.isStrike ? `Strike ${strike.strikeNumber}` : 'Flag'
      const vY    = doc.y

      pill(doc, MARGIN, vY, 56, 16, `[${label}]`, color)

      doc.fillColor(DARK).fontSize(9).font('Helvetica')
         .text(String(strike.violationType).replace(/_/g, ' '), MARGIN + 62, vY + 4, { continued: true, width: 160 })
      doc.fillColor(LGRAY).fontSize(8)
         .text(`   ${new Date(strike.occurredAt).toLocaleString('en-IN')}`)

      if (strike.screenshotUrl) {
        doc.fillColor(TEAL).fontSize(7.5)
           .text(`Screenshot: ${strike.screenshotUrl}`, MARGIN + 62, doc.y, { width: contentW(doc) - 62 })
      }

      doc.y = Math.max(doc.y, vY + 20) + 2
    }
    doc.moveDown(0.3)
  }

  // ════════════════════════════════════════════════════════════
  // RECRUITER NOTES
  // ════════════════════════════════════════════════════════════
  if (data.scorecard.recruiterNotes) {
    pageCheck(doc, 50)
    sectionTitle(doc, 'Recruiter Notes')

    if (data.scorecard.recruiterRating) {
      const stars   = '★'.repeat(data.scorecard.recruiterRating)
      const noStars = '☆'.repeat(5 - data.scorecard.recruiterRating)
      doc.fillColor(ORANGE).fontSize(14).text(stars + noStars, MARGIN, doc.y)
      doc.moveDown(0.3)
    }
    doc.fillColor(DARK).fontSize(9.5).font('Helvetica')
       .text(data.scorecard.recruiterNotes, MARGIN, doc.y, { width: contentW(doc) })
    doc.moveDown(0.5)
  }

  // ════════════════════════════════════════════════════════════
  // FOOTER on every page
  // ════════════════════════════════════════════════════════════
  const range = (doc as any).bufferedPageRange()
  for (let i = 0; i < range.count; i++) {
    ;(doc as any).switchToPage(range.start + i)
    doc.rect(0, ph(doc) - 28, pw(doc), 28).fill(NAVY)
    doc.fillColor('#64748B').fontSize(7.5).font('Helvetica')
       .text(
         `SmartHire AI  ·  Confidential  ·  ${data.candidate.firstName} ${data.candidate.lastName}  ·  Page ${i + 1} of ${range.count}`,
         0, ph(doc) - 18, { align: 'center', width: pw(doc) },
       )
  }

  doc.end()
  return doc as unknown as Readable
} 