import ExcelJS from 'exceljs'
import { prisma } from '../../lib/prisma'

export async function generateCampaignExcel(campaignId: string): Promise<ExcelJS.Buffer> {
  const candidates = await prisma.candidateProfile.findMany({
    where: { campaignId },
    include: {
      user:      { select: { firstName: true, lastName: true, email: true, lastLoginAt: true } },
      scorecard: true,
      attempts:  {
        include: {
          mcqAnswers:        { select: { marksAwarded: true, isCorrect: true } },
          codingSubmissions: { select: { marksAwarded: true, testCasesPassed: true, testCasesTotal: true } },
          interviewAnswers:  { select: { aiScore: true } },
        },
      },
      strikeLog: { where: { isStrike: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
    include: { rounds: { orderBy: { order: 'asc' } } },
  })

  const workbook = new ExcelJS.Workbook()
  workbook.creator  = 'SmartHire AI'
  workbook.created  = new Date()

  // ── Colors ──────────────────────────────────────────────────
  const PURPLE  = '6366F1'
  const GREEN   = '10B981'
  const RED     = 'EF4444'
  const AMBER   = 'F59E0B'
  const GRAY    = 'F3F4F6'
  const DARK    = '1E1B4B'

  // ════════════════════════════════════════════════════════════
  //  SHEET 1 — Summary
  // ════════════════════════════════════════════════════════════
  const summary = workbook.addWorksheet('Summary', {
    pageSetup: { fitToPage: true, fitToWidth: 1 },
  })

  // Campaign header
  summary.mergeCells('A1:H1')
  const titleCell = summary.getCell('A1')
  titleCell.value         = `SmartHire AI — ${campaign.name}`
  titleCell.font          = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
  titleCell.fill          = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${PURPLE}` } }
  titleCell.alignment     = { vertical: 'middle', horizontal: 'center' }
  summary.getRow(1).height = 36

  summary.mergeCells('A2:H2')
  const subCell = summary.getCell('A2')
  subCell.value       = `Role: ${campaign.role}  |  Generated: ${new Date().toLocaleString()}  |  Total Candidates: ${candidates.length}`
  subCell.font        = { size: 11, color: { argb: 'FF6B7280' } }
  subCell.alignment   = { horizontal: 'center', vertical: 'middle' }
  subCell.fill        = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE9FE' } }
  summary.getRow(2).height = 24

  // Column headers — row 4
  const headers = [
    { header: '#',                key: 'num',        width: 5  },
    { header: 'Name',             key: 'name',       width: 22 },
    { header: 'Email',            key: 'email',      width: 28 },
    { header: 'Status',           key: 'status',     width: 14 },
    { header: 'Technical Fit %',  key: 'fit',        width: 16 },
    { header: 'Trust Score %',    key: 'trust',      width: 15 },
    { header: 'Total Strikes',    key: 'strikes',    width: 14 },
    { header: 'Last Login',       key: 'lastLogin',  width: 20 },
  ]

  summary.columns = headers
  const headerRow = summary.getRow(4)
  headerRow.values = ['#', 'Name', 'Email', 'Status', 'Technical Fit %', 'Trust Score %', 'Total Strikes', 'Last Login']
  headerRow.eachCell(cell => {
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${DARK}` } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border    = { bottom: { style: 'thin', color: { argb: `FF${PURPLE}` } } }
  })
  summary.getRow(4).height = 28

  // Data rows
  candidates.forEach((c, i) => {
    const sc      = c.scorecard as any
    const strikes = c.strikeLog.length
    const fit     = sc?.technicalFitPercent ?? null
    const trust   = sc?.trustScore ?? null

    const row = summary.addRow([
      i + 1,
      `${c.user.firstName} ${c.user.lastName}`,
      c.user.email,
      c.status,
      fit   !== null ? parseFloat(fit.toFixed(1))   : 'N/A',
      trust !== null ? parseFloat(trust.toFixed(1)) : 'N/A',
      strikes,
      c.user.lastLoginAt ? new Date(c.user.lastLoginAt).toLocaleString() : 'Never',
    ])

    // Alternate row shading
    if (i % 2 === 0) {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${GRAY}` } }
      })
    }

    // Status color
    const statusCell = row.getCell(4)
    const statusColor =
      c.status === 'COMPLETED'   ? GREEN :
      c.status === 'TERMINATED'  ? RED   :
      c.status === 'SHORTLISTED' ? PURPLE :
      c.status === 'REJECTED'    ? RED   : AMBER

    statusCell.font = { bold: true, color: { argb: `FF${statusColor}` } }

    // Fit % color
    if (fit !== null) {
      const fitCell = row.getCell(5)
      fitCell.font = { bold: true, color: { argb: fit >= 60 ? `FF${GREEN}` : `FF${RED}` } }
    }

    row.height = 22
    row.alignment = { vertical: 'middle' }
  })

  // Auto-filter
  summary.autoFilter = { from: 'A4', to: 'H4' }

  // ════════════════════════════════════════════════════════════
  //  SHEET 2 — Round Details
  // ════════════════════════════════════════════════════════════
  const details = workbook.addWorksheet('Round Details')

  // Build dynamic columns based on campaign rounds
  const roundCols: any[] = [
    { header: 'Name',  key: 'name',  width: 22 },
    { header: 'Email', key: 'email', width: 28 },
  ]

  for (const round of campaign.rounds) {
    roundCols.push({ header: `R${round.order} Score %`,  key: `r${round.order}_score`,  width: 14 })
    roundCols.push({ header: `R${round.order} Pass/Fail`,key: `r${round.order}_pass`,   width: 14 })
    roundCols.push({ header: `R${round.order} Type`,     key: `r${round.order}_type`,   width: 12 })
  }

  details.columns = roundCols

  const detailHeader = details.getRow(1)
  detailHeader.eachCell(cell => {
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${DARK}` } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  details.getRow(1).height = 28

  candidates.forEach((c, i) => {
    const sc         = c.scorecard as any
    const roundScores: any[] = sc?.roundScores || []

    const rowData: any = {
      name:  `${c.user.firstName} ${c.user.lastName}`,
      email: c.user.email,
    }

    for (const round of campaign.rounds) {
      const rs = roundScores.find((r: any) => r.roundId === round.id)
      rowData[`r${round.order}_score`] = rs ? parseFloat((rs.percent || 0).toFixed(1)) : 'N/A'
      rowData[`r${round.order}_pass`]  = rs ? (rs.passed ? 'PASS' : 'FAIL') : 'N/A'
      rowData[`r${round.order}_type`]  = round.roundType
    }

    const row = details.addRow(rowData)

    if (i % 2 === 0) {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${GRAY}` } }
      })
    }

    // Color PASS/FAIL cells
    for (const round of campaign.rounds) {
      const passCell = row.getCell(`r${round.order}_pass`)
      if (passCell.value === 'PASS') passCell.font = { bold: true, color: { argb: `FF${GREEN}` } }
      if (passCell.value === 'FAIL') passCell.font = { bold: true, color: { argb: `FF${RED}` } }
    }

    row.height    = 22
    row.alignment = { vertical: 'middle' }
  })

  details.autoFilter = { from: 'A1', to: { row: 1, column: roundCols.length } }

  // ════════════════════════════════════════════════════════════
  //  SHEET 3 — Strike Log
  // ════════════════════════════════════════════════════════════
  const strikeSheet = workbook.addWorksheet('Strike Log')
  strikeSheet.columns = [
    { header: 'Name',           key: 'name',      width: 22 },
    { header: 'Email',          key: 'email',     width: 28 },
    { header: 'Violation',      key: 'violation', width: 20 },
    { header: 'Strike No.',     key: 'num',       width: 12 },
    { header: 'Is Strike',      key: 'isStrike',  width: 12 },
    { header: 'Occurred At',    key: 'time',      width: 22 },
  ]

  const strikeHeader = strikeSheet.getRow(1)
  strikeHeader.eachCell(cell => {
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${RED}` } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  strikeSheet.getRow(1).height = 28

  let strikeRowIdx = 0
  for (const c of candidates) {
    const allStrikes = await prisma.strikeEvent.findMany({
      where:   { candidateId: c.id },
      orderBy: { occurredAt: 'asc' },
    })
    for (const s of allStrikes) {
      const row = strikeSheet.addRow({
        name:      `${c.user.firstName} ${c.user.lastName}`,
        email:     c.user.email,
        violation: s.violationType,
        num:       s.strikeNumber,
        isStrike:  s.isStrike ? 'YES' : 'Flag only',
        time:      new Date(s.occurredAt).toLocaleString(),
      })
      if (strikeRowIdx % 2 === 0) {
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F1' } }
        })
      }
      const isStrikeCell = row.getCell('isStrike')
      isStrikeCell.font = {
        bold:  true,
        color: { argb: s.isStrike ? `FF${RED}` : `FF${AMBER}` },
      }
      row.height = 22
      strikeRowIdx++
    }
  }

  // ════════════════════════════════════════════════════════════
  //  SHEET 4 — AI Gap Analysis
  // ════════════════════════════════════════════════════════════
  const gapSheet = workbook.addWorksheet('AI Gap Analysis')
  gapSheet.columns = [
    { header: 'Name',             key: 'name',       width: 22 },
    { header: 'Email',            key: 'email',      width: 28 },
    { header: 'Technical Fit %',  key: 'fit',        width: 16 },
    { header: 'Trust Score %',    key: 'trust',      width: 15 },
    { header: 'Strengths',        key: 'strengths',  width: 40 },
    { header: 'Skill Gaps',       key: 'gaps',       width: 40 },
    { header: 'Matched Skills',   key: 'matched',    width: 40 },
    { header: 'Missing Skills',   key: 'missing',    width: 40 },
    { header: 'AI Summary',       key: 'summary',    width: 60 },
  ]

  const gapHeader = gapSheet.getRow(1)
  gapHeader.eachCell(cell => {
    cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${PURPLE}` } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  })
  gapSheet.getRow(1).height = 28

  candidates.forEach((c, i) => {
    const sc  = c.scorecard as any
    const gap = sc?.gapAnalysis as any

    const row = gapSheet.addRow({
      name:      `${c.user.firstName} ${c.user.lastName}`,
      email:     c.user.email,
      fit:       sc?.technicalFitPercent != null ? parseFloat(sc.technicalFitPercent.toFixed(1)) : 'N/A',
      trust:     sc?.trustScore != null ? parseFloat(sc.trustScore.toFixed(1)) : 'N/A',
      strengths: gap?.strengths?.join(', ')       || 'N/A',
      gaps:      gap?.gaps?.join(', ')            || 'N/A',
      matched:   gap?.jdMatchedSkills?.join(', ') || 'N/A',
      missing:   gap?.jdMissingSkills?.join(', ') || 'N/A',
      summary:   gap?.aiSummary                   || 'N/A',
    })

    if (i % 2 === 0) {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE9FE' } }
      })
    }

    row.alignment = { vertical: 'middle', wrapText: true }
    row.height    = 40
  })

  return await workbook.xlsx.writeBuffer() as ExcelJS.Buffer
}