import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { campaignApi, recruiterApi } from '../../services/api.services'
import {
  BarChart3, PieChart as PieChartIcon, TrendingUp, Users, Send, CheckCircle, XCircle, Filter
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'

const PIE_COLORS = ['#23979c', '#fb851e', '#e74c3c', '#f1c40f', '#6366f1', '#a3a3a3']

export default function AnalyticsPage() {
  const [selectedCampaign, setSelectedCampaign] = useState<string>('ALL')

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignApi.getAll,
  })

  // Get candidates for the selected campaign(s)
  const campaignIds = selectedCampaign === 'ALL'
    ? campaigns.map((c: any) => c.id)
    : [selectedCampaign]

  const candidateQueries = useQuery({
    queryKey: ['analytics-candidates', campaignIds],
    queryFn: async () => {
      const all: any[] = []
      for (const id of campaignIds) {
        try {
          const cands = await recruiterApi.getCandidates(id)
          all.push(...cands.map((c: any) => ({ ...c, campaignId: id })))
        } catch { /* skip unauthorized */ }
      }
      return all
    },
    enabled: campaignIds.length > 0,
  })

  const candidates = candidateQueries.data || []

  // ── Calculated stats ──────────────────────────────────────
  const totalInvited = candidates.filter((c: any) => c.status !== 'LOCKED').length
  const completed = candidates.filter((c: any) => c.status === 'COMPLETED').length
  const terminated = candidates.filter((c: any) => c.status === 'TERMINATED').length
  const scored = candidates.filter((c: any) => c.scorecard?.technicalFitPercent)
  const avgFit = scored.length > 0
    ? (scored.reduce((s: number, c: any) => s + (c.scorecard?.technicalFitPercent || 0), 0) / scored.length)
    : 0
  const completionRate = totalInvited > 0 ? ((completed / totalInvited) * 100) : 0
  const terminationRate = totalInvited > 0 ? ((terminated / totalInvited) * 100) : 0

  // ── Funnel chart data ─────────────────────────────────────
  const funnel = useMemo(() => [
    { stage: 'Invited', count: totalInvited },
    { stage: 'Onboarding', count: candidates.filter((c: any) => ['ONBOARDING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'TERMINATED', 'SHORTLISTED', 'REJECTED'].includes(c.status)).length },
    { stage: 'Ready', count: candidates.filter((c: any) => ['READY', 'IN_PROGRESS', 'COMPLETED', 'TERMINATED', 'SHORTLISTED', 'REJECTED'].includes(c.status)).length },
    { stage: 'Completed', count: candidates.filter((c: any) => ['COMPLETED', 'SHORTLISTED', 'REJECTED'].includes(c.status)).length },
    { stage: 'Passed', count: candidates.filter((c: any) => ['SHORTLISTED', 'COMPLETED'].includes(c.status) && (c.scorecard?.technicalFitPercent || 0) >= 60).length },
  ], [candidates])

  // ── Status distribution ───────────────────────────────────
  const statusDist = useMemo(() => {
    const map: Record<string, number> = {}
    candidates.forEach((c: any) => { map[c.status] = (map[c.status] || 0) + 1 })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [candidates])

  // ── Top candidates ────────────────────────────────────────
  const topCandidates = useMemo(() => {
    return [...candidates]
      .filter((c: any) => c.scorecard?.technicalFitPercent)
      .sort((a: any, b: any) => (b.scorecard?.technicalFitPercent || 0) - (a.scorecard?.technicalFitPercent || 0))
      .slice(0, 10)
  }, [candidates])

  const statCards = [
    { icon: Send, label: 'Total Invitations', value: totalInvited, colorClass: 'orange' },
    { icon: CheckCircle, label: 'Completion Rate', value: `${completionRate.toFixed(1)}%`, colorClass: 'green' },
    { icon: TrendingUp, label: 'Average Fit %', value: `${avgFit.toFixed(1)}%`, colorClass: 'teal' },
    { icon: XCircle, label: 'Termination Rate', value: `${terminationRate.toFixed(1)}%`, colorClass: 'red' },
  ]

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="section-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 style={{ marginBottom: '4px' }}>
            <span style={{ color: 'var(--orange)' }}>Analytics</span>
          </h1>
          <p className="section-subtitle">Performance metrics across your campaigns</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          <select className="form-select" style={{ minWidth: '200px' }}
            value={selectedCampaign}
            onChange={e => setSelectedCampaign(e.target.value)}
          >
            <option value="ALL">All Campaigns</option>
            {campaigns.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name} — {c.role}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom: '28px' }}>
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.colorClass}`}>
              <s.icon size={22} />
            </div>
            <div className="stat-info">
              <div className="stat-value">{candidateQueries.isLoading ? '—' : s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid-2" style={{ gap: '20px', marginBottom: '24px' }}>
        {/* Funnel */}
        <div className="card">
          <h3 style={{ fontSize: '0.95rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={17} style={{ color: 'var(--orange)' }} /> Conversion Funnel
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={funnel} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="stage" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--cream)' }}
              />
              <Bar dataKey="count" fill="#fb851e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Pie */}
        <div className="card">
          <h3 style={{ fontSize: '0.95rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PieChartIcon size={17} style={{ color: 'var(--teal)' }} /> Status Distribution
          </h3>
          {statusDist.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <div className="empty-icon"><Users size={32} /></div>
              <div className="empty-desc">No candidates to analyze</div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusDist} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={90} innerRadius={45}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {statusDist.map((_entry, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--cream)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Candidates Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '18px 22px 14px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <TrendingUp size={17} style={{ color: 'var(--orange)' }} />
          <div>
            <h3 style={{ fontSize: '0.95rem' }}>Top Candidates</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '2px' }}>
              Ranked by Technical Fit %
            </p>
          </div>
        </div>

        {topCandidates.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div className="empty-title">No scored candidates yet</div>
          </div>
        ) : (
          <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Candidate</th>
                  <th>Campaign</th>
                  <th>Fit %</th>
                  <th>Trust Score</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {topCandidates.map((c: any, i: number) => {
                  const fit = Math.round(c.scorecard?.technicalFitPercent || 0)
                  const trust = Math.round(c.scorecard?.trustScore || 100)
                  const fitColor = fit >= 70 ? 'var(--green-light)' : fit >= 40 ? 'var(--orange)' : 'var(--red)'
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 700, color: i < 3 ? 'var(--orange)' : 'var(--text-muted)' }}>{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--cream)', fontSize: '0.88rem' }}>
                          {c.user?.firstName} {c.user?.lastName}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{c.user?.email}</div>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {campaigns.find((cp: any) => cp.id === c.campaignId)?.name || '—'}
                      </td>
                      <td style={{ fontWeight: 700, color: fitColor, fontSize: '0.95rem' }}>{fit}%</td>
                      <td style={{ fontWeight: 600, color: trust >= 80 ? 'var(--green-light)' : 'var(--orange)' }}>{trust}</td>
                      <td><span className="badge badge-muted">{c.status}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
