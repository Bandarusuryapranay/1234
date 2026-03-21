import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { recruiterApi } from '../../services/api.services'
import {
  Download, FileText, FileSpreadsheet,
  ChevronDown, BarChart2, Loader2
} from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts'

const STATUS_LABELS: Record<string, string> = {
  LOCKED: 'Locked', INVITED: 'Invited', ONBOARDING: 'Onboarding',
  READY: 'Ready', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed',
  TERMINATED: 'Terminated', SHORTLISTED: 'Shortlisted', REJECTED: 'Rejected',
}
const STATUS_COLORS: Record<string, string> = {
  LOCKED: '#6b7280', INVITED: '#0ea5e9', ONBOARDING: '#f97316',
  READY: '#22c55e', IN_PROGRESS: '#f59e0b', COMPLETED: '#14b8a6',
  TERMINATED: '#ef4444', SHORTLISTED: '#8b5cf6', REJECTED: '#374151',
}

export default function ReportsPage() {
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | 'pdf' | null>(null)

  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['recruiter', 'campaigns'],
    queryFn: recruiterApi.getMyCampaigns,
  })

  // Auto-select first campaign
  useEffect(() => {
    if ((campaigns as any[]).length > 0 && !selectedCampaignId) {
      setSelectedCampaignId((campaigns as any[])[0].campaignId)
    }
  }, [campaigns, selectedCampaignId])

  const { data: candidates = [], isLoading: isLoadingCandidates } = useQuery({
    queryKey: ['recruiter', 'candidates', selectedCampaignId],
    queryFn: () => recruiterApi.getCandidates(selectedCampaignId),
    enabled: !!selectedCampaignId,
  })

  const activeCampaign = (campaigns as any[]).find((c: any) => c.campaignId === selectedCampaignId)
  const candidateList = candidates as any[]

  // Chart data
  const statusCounts = candidateList.reduce((acc: Record<string, number>, c: any) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {})

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count as number,
    fill: STATUS_COLORS[status] || '#6b7280',
  }))

  const barData = pieData.map(d => ({ name: d.name, Candidates: d.value, fill: d.fill }))

  const buildExportRows = () =>
    candidateList.map((c: any) => {
      const score = Math.round(c.scorecard?.technicalFitPercent || 0)
      const trust = Math.round(c.scorecard?.trustScore || 0)
      const strikes = c.strikeLog?.length || 0
      return {
        'First Name': c.user.firstName,
        'Last Name': c.user.lastName,
        Email: c.user.email,
        Status: STATUS_LABELS[c.status] || c.status,
        'Fit Score (%)': ['COMPLETED', 'TERMINATED', 'SHORTLISTED', 'REJECTED'].includes(c.status) ? score : '',
        'Trust Score': ['COMPLETED', 'TERMINATED', 'SHORTLISTED', 'REJECTED'].includes(c.status) ? trust : '',
        Strikes: strikes,
        'Last Active': c.user.lastLoginAt ? new Date(c.user.lastLoginAt).toLocaleDateString('en-IN') : 'Never',
      }
    })

  const fileName = () =>
    `Report_${activeCampaign?.campaign?.name?.replace(/\s+/g, '_') || 'Campaign'}_${new Date().toISOString().split('T')[0]}`

  const exportCSV = () => {
    setExporting('csv')
    try {
      const csv = Papa.unparse(buildExportRows())
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${fileName()}.csv`
      link.click()
      toast.success('CSV downloaded!')
    } catch {
      toast.error('CSV export failed')
    } finally { setExporting(null) }
  }

  const exportExcel = () => {
    setExporting('xlsx')
    try {
      const ws = XLSX.utils.json_to_sheet(buildExportRows())
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Candidates')
      XLSX.writeFile(wb, `${fileName()}.xlsx`)
      toast.success('Excel file downloaded!')
    } catch {
      toast.error('Excel export failed')
    } finally { setExporting(null) }
  }

  const exportPDF = () => {
    setExporting('pdf')
    try {
      const doc = new jsPDF('landscape')
      doc.setFontSize(16)
      doc.setTextColor(30, 30, 30)
      doc.text(`Campaign Report: ${activeCampaign?.campaign?.name || ''}`, 14, 16)
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Role: ${activeCampaign?.campaign?.role || ''} | Exported: ${new Date().toLocaleString('en-IN')}`, 14, 24)

      // Summary boxes
      const summary = [
        { label: 'Total', value: candidateList.length },
        { label: 'Completed', value: statusCounts['COMPLETED'] || 0 },
        { label: 'In Progress', value: statusCounts['IN_PROGRESS'] || 0 },
        { label: 'Shortlisted', value: statusCounts['SHORTLISTED'] || 0 },
        { label: 'Terminated', value: statusCounts['TERMINATED'] || 0 },
      ]
      summary.forEach((s, i) => {
        const x = 14 + i * 56
        doc.setFillColor(240, 240, 240)
        doc.roundedRect(x, 30, 52, 16, 3, 3, 'F')
        doc.setFontSize(8)
        doc.setTextColor(90, 90, 90)
        doc.text(s.label, x + 4, 37)
        doc.setFontSize(14)
        doc.setTextColor(20, 20, 20)
        doc.text(String(s.value), x + 4, 44)
      })

      const rows = buildExportRows()
      autoTable(doc, {
        startY: 52,
        head: [Object.keys(rows[0] || {})],
        body: rows.map(r => Object.values(r)),
        theme: 'grid',
        headStyles: { fillColor: [35, 151, 156], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
      })

      doc.save(`${fileName()}.pdf`)
      toast.success('PDF downloaded!')
    } catch {
      toast.error('PDF export failed')
    } finally { setExporting(null) }
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 style={{ marginBottom: '4px' }}>
            <span style={{ color: 'var(--orange)' }}>Campaign</span> Reports
          </h1>
          <p className="section-subtitle">
            Generate and download detailed reports for your campaigns in PDF, CSV, or Excel format.
          </p>
        </div>
      </div>

      {/* Campaign Selector */}
      <div className="card" style={{ marginBottom: '24px', padding: '20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '280px', position: 'relative' }}>
          <label className="form-label">Select Campaign</label>
          <select
            className="form-select"
            value={selectedCampaignId}
            onChange={e => setSelectedCampaignId(e.target.value)}
            disabled={isLoadingCampaigns}
            style={{ fontWeight: 600, marginTop: '4px' }}
          >
            {(campaigns as any[]).length === 0
              ? <option value="">No campaigns assigned</option>
              : (campaigns as any[]).map((c: any) => (
                <option key={c.campaignId} value={c.campaignId}>
                  {c.campaign.name} — {c.campaign.role}
                </option>
              ))}
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: '12px', bottom: '13px', pointerEvents: 'none', color: 'var(--text-muted)' }} />
        </div>

        {/* Export buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end', paddingTop: '20px' }}>
          <button className="btn btn-outline" onClick={exportCSV} disabled={!selectedCampaignId || isLoadingCandidates || exporting !== null}>
            {exporting === 'csv' ? <Loader2 size={15} className="spin-once" /> : <FileText size={15} />}
            CSV
          </button>
          <button className="btn btn-outline" onClick={exportExcel} disabled={!selectedCampaignId || isLoadingCandidates || exporting !== null}>
            {exporting === 'xlsx' ? <Loader2 size={15} className="spin-once" /> : <FileSpreadsheet size={15} />}
            Excel
          </button>
          <button className="btn btn-primary" onClick={exportPDF} disabled={!selectedCampaignId || isLoadingCandidates || exporting !== null}>
            {exporting === 'pdf' ? <Loader2 size={15} className="spin-once" /> : <Download size={15} />}
            Export PDF
          </button>
        </div>
      </div>

      {isLoadingCandidates ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: 'var(--text-secondary)', gap: '10px', alignItems: 'center' }}>
          <div className="spinner" /> Loading report data...
        </div>
      ) : candidateList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><BarChart2 size={40} style={{ opacity: 0.3 }} /></div>
          <div className="empty-title">No data available</div>
          <div className="empty-desc">This campaign has no candidates yet. Add candidates to generate a report.</div>
        </div>
      ) : (
        <>
          {/* Summary chips */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px', marginBottom: '24px' }}>
            {[
              { label: 'Total', value: candidateList.length, color: 'var(--teal)' },
              { label: 'Completed', value: statusCounts['COMPLETED'] || 0, color: 'var(--green-dark)' },
              { label: 'In Progress', value: statusCounts['IN_PROGRESS'] || 0, color: 'var(--orange)' },
              { label: 'Shortlisted', value: statusCounts['SHORTLISTED'] || 0, color: 'var(--primary)' },
              { label: 'Terminated', value: statusCounts['TERMINATED'] || 0, color: 'var(--red)' },
              { label: 'Pending', value: (statusCounts['LOCKED'] || 0) + (statusCounts['INVITED'] || 0) + (statusCounts['READY'] || 0), color: 'var(--text-muted)' },
            ].map((s, i) => (
              <div key={i} className="card" style={{ padding: '16px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div className="card">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '20px', color: 'var(--cream)' }}>Status Breakdown (Bar)</h3>
              <div style={{ height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 0, right: 10, left: -20, bottom: 40 }}>
                    <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} angle={-30} textAnchor="end" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="Candidates" radius={[4,4,0,0]}>
                      {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '20px', color: 'var(--cream)' }}>Status Distribution (Pie)</h3>
              <div style={{ height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                {pieData.map((d, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: d.fill, flexShrink: 0 }} />
                    {d.name} ({d.value})
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Data Table Preview */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--cream)', margin: 0 }}>Data Preview</h3>
              <span className="badge badge-muted">{candidateList.length} candidates</span>
            </div>
            <div className="table-wrap" style={{ border: 'none', borderRadius: 0, maxHeight: '360px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Fit Score</th>
                    <th>Trust Score</th>
                    <th>Strikes</th>
                    <th>Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {candidateList.map((c: any) => {
                    const score = Math.round(c.scorecard?.technicalFitPercent || 0)
                    const trust = Math.round(c.scorecard?.trustScore || 0)
                    const strikes = c.strikeLog?.length || 0
                    const hasScore = ['COMPLETED', 'TERMINATED', 'SHORTLISTED', 'REJECTED'].includes(c.status)
                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600, color: 'var(--cream)' }}>{c.user.firstName} {c.user.lastName}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{c.user.email}</td>
                        <td>
                          <span className="badge" style={{ background: STATUS_COLORS[c.status] + '22', color: STATUS_COLORS[c.status], border: `1px solid ${STATUS_COLORS[c.status]}44` }}>
                            {STATUS_LABELS[c.status] || c.status}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: hasScore ? (score >= 70 ? 'var(--green-dark)' : 'var(--orange)') : 'var(--text-muted)' }}>
                          {hasScore ? `${score}%` : '—'}
                        </td>
                        <td style={{ color: hasScore ? 'var(--cream)' : 'var(--text-muted)' }}>
                          {hasScore ? trust : '—'}
                        </td>
                        <td>
                          {strikes > 0
                            ? <span className={`badge ${strikes >= 3 ? 'badge-danger' : strikes === 2 ? 'badge-warning' : 'badge-success'}`}>{strikes}</span>
                            : <span style={{ color: 'var(--text-muted)' }}>0</span>}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {c.user.lastLoginAt ? new Date(c.user.lastLoginAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
