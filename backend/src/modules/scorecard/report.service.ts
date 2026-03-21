import PDFDocument from 'pdfkit'
import type { Readable } from 'stream'

interface ReportData {
  candidate: {
    firstName:    string
    lastName:     string
    email:        string
  }
  campaign: {
    name: string
    role: string
  }
  scorecard: {
    technicalFitPercent?: number
    trustScore?:          number
    roundScores:          any[]
    gapAnalysis?:         any
    recruiterNotes?:      string
    recruiterRating?:     number
    generatedAt?:         string
  }
  strikeLog: any[]
}

export function generateReportPDF(data: ReportData): Readable {
  const doc = new PDFDocument({ margin: 50, size: 'A4' })

  const PURPLE = '#6366f1'
  const DARK   = '#1e1b4b'
  const GRAY   = '#6b7280'
  const GREEN  = '#10b981'
  const RED    = '#ef4444'
  const LIGHT  = '#f3f4f6'

  // ── Header ─────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 80).fill(PURPLE)
  doc.fillColor('#ffffff').fontSize(22).font('Helvetica-Bold')
     .text('SmartHire AI', 50, 25)
  doc.fontSize(11).font('Helvetica')
     .text('Candidate Assessment Report', 50, 52)
  doc.fillColor(DARK)

  // ── Candidate info block ───────────────────────────────────
  doc.y = 100
  doc.fontSize(18).font('Helvetica-Bold').fillColor(DARK)
     .text(`${data.candidate.firstName} ${data.candidate.lastName}`)
  doc.fontSize(11).font('Helvetica').fillColor(GRAY)
     .text(data.candidate.email)
     .text(`Role: ${data.campaign.role}  ·  Campaign: ${data.campaign.name}`)
     .text(`Report generated: ${data.scorecard.generatedAt ? new Date(data.scorecard.generatedAt).toLocaleString() : new Date().toLocaleString()}`)

  doc.moveDown(1)
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke(LIGHT)
  doc.moveDown(0.5)

  // ── Score summary boxes ────────────────────────────────────
  const fitPct   = data.scorecard.technicalFitPercent ?? 0
  const trust    = data.scorecard.trustScore ?? 0
  const strikes  = data.strikeLog.filter(s => s.isStrike).length

  drawScoreBox(doc, 50,  doc.y, 'Technical Fit', `${fitPct.toFixed(0)}%`, fitPct >= 60 ? GREEN : RED)
  drawScoreBox(doc, 200, doc.y, 'Trust Score',   `${trust.toFixed(0)}%`,  trust >= 70  ? GREEN : RED)
  drawScoreBox(doc, 350, doc.y, 'Strikes',       `${strikes}`,            strikes === 0 ? GREEN : RED)

  doc.y += 70
  doc.moveDown(1)

  // ── Per-round scores ───────────────────────────────────────
  sectionHeader(doc, 'Round Scores', PURPLE)

  for (const round of data.scorecard.roundScores || []) {
    const passColor = round.passed ? GREEN : RED
    const passLabel = round.passed ? 'PASS' : 'FAIL'
    doc.fontSize(11).font('Helvetica-Bold').fillColor(DARK)
       .text(`Round ${round.roundId?.slice(-6) || '—'}  (${round.roundType || ''})`, 50, doc.y, { continued: true })
    doc.font('Helvetica').fillColor(GRAY)
       .text(`   Score: ${(round.percent || 0).toFixed(1)}%`, { continued: true })
    doc.fillColor(passColor).text(`   ${passLabel}`)
    doc.moveDown(0.3)
  }

  doc.moveDown(0.5)

  // ── AI Gap Analysis ────────────────────────────────────────
  if (data.scorecard.gapAnalysis) {
    const gap = data.scorecard.gapAnalysis

    sectionHeader(doc, 'AI Gap Analysis', PURPLE)

    if (gap.aiSummary) {
      doc.fontSize(11).font('Helvetica-Oblique').fillColor(DARK)
         .text(`"${gap.aiSummary}"`, 50, doc.y, { width: 495 })
      doc.moveDown(0.8)
    }

    if (gap.strengths?.length) {
      subsectionLabel(doc, '✓ Strengths', GREEN)
      for (const s of gap.strengths) bulletLine(doc, s, DARK)
      doc.moveDown(0.4)
    }

    if (gap.gaps?.length) {
      subsectionLabel(doc, '✗ Skill Gaps', RED)
      for (const g of gap.gaps) bulletLine(doc, g, DARK)
      doc.moveDown(0.4)
    }

    if (gap.jdMatchedSkills?.length) {
      subsectionLabel(doc, 'JD Skills Matched', GREEN)
      doc.fontSize(10).font('Helvetica').fillColor(DARK)
         .text(gap.jdMatchedSkills.join('  ·  '), 60, doc.y, { width: 485 })
      doc.moveDown(0.4)
    }

    if (gap.jdMissingSkills?.length) {
      subsectionLabel(doc, 'JD Skills Missing', RED)
      doc.fontSize(10).font('Helvetica').fillColor(DARK)
         .text(gap.jdMissingSkills.join('  ·  '), 60, doc.y, { width: 485 })
      doc.moveDown(0.4)
    }
  }

  // ── Strike log ─────────────────────────────────────────────
  if (data.strikeLog.length > 0) {
    sectionHeader(doc, 'Proctoring Violations', PURPLE)

    for (const strike of data.strikeLog) {
      const color = strike.isStrike ? RED : '#f59e0b'
      const label = strike.isStrike ? `Strike ${strike.strikeNumber}` : 'Flag'
      doc.fontSize(10).font('Helvetica').fillColor(color)
         .text(`[${label}]  ${strike.violationType}`, 50, doc.y, { continued: true })
      doc.fillColor(GRAY)
         .text(`   ${new Date(strike.occurredAt).toLocaleString()}`)
      doc.moveDown(0.2)
    }
    doc.moveDown(0.5)
  }

  // ── Recruiter notes ────────────────────────────────────────
  if (data.scorecard.recruiterNotes) {
    if (doc.y > 700) doc.addPage()
    sectionHeader(doc, 'Recruiter Notes', PURPLE)
    if (data.scorecard.recruiterRating) {
      doc.fontSize(11).font('Helvetica-Bold').fillColor(PURPLE)
         .text(`Rating: ${'★'.repeat(data.scorecard.recruiterRating)}${'☆'.repeat(5 - data.scorecard.recruiterRating)}`)
      doc.moveDown(0.3)
    }
    doc.fontSize(11).font('Helvetica').fillColor(DARK)
       .text(data.scorecard.recruiterNotes, 50, doc.y, { width: 495 })
  }

  // ── Footer ─────────────────────────────────────────────────
  doc.fontSize(9).fillColor(GRAY)
     .text('Generated by SmartHire AI  —  Confidential', 50,
       doc.page.height - 40, { align: 'center', width: 495 })

  doc.end()
  return doc as unknown as Readable
}

// ── Helpers ────────────────────────────────────────────────────

function drawScoreBox(doc: any, x: number, y: number, label: string, value: string, color: string) {
  doc.rect(x, y, 130, 55).fill('#f9fafb').stroke('#e5e7eb')
  doc.fontSize(10).font('Helvetica').fillColor('#6b7280').text(label, x + 8, y + 8, { width: 114 })
  doc.fontSize(20).font('Helvetica-Bold').fillColor(color).text(value, x + 8, y + 24, { width: 114 })
}

function sectionHeader(doc: any, title: string, color: string) {
  doc.moveDown(0.5)
  doc.fontSize(13).font('Helvetica-Bold').fillColor(color).text(title)
  doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke(color)
  doc.moveDown(0.5)
}

function subsectionLabel(doc: any, label: string, color: string) {
  doc.fontSize(11).font('Helvetica-Bold').fillColor(color).text(label, 55, doc.y)
  doc.moveDown(0.2)
}

function bulletLine(doc: any, text: string, color: string) {
  doc.fontSize(10).font('Helvetica').fillColor(color)
     .text(`• ${text}`, 65, doc.y, { width: 480 })
  doc.moveDown(0.15)
}