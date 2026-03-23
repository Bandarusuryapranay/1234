import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { campaignApi, recruiterApi } from '../../services/api.services'
import {
  BarChart3, PieChart as PieChartIcon, TrendingUp, Users,
  Send, CheckCircle, XCircle, Filter, ShieldAlert, Target,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, ComposedChart,
} from 'recharts'

// ── Colour palettes ───────────────────────────────────────────
const PIE_COLORS  = ['#23979c','#fb851e','#e74c3c','#f1c40f','#6366f1','#a3a3a3','#27ae60','#9b59b6']
const REC_COLORS: Record<string, string> = {
  'STRONG HIRE': '#27AE60',
  'HIRE':        '#23979C',
  'BORDERLINE':  '#E67E22',
  'NO HIRE':     '#E74C3C',
}
const CRED_COLORS: Record<string, string> = {
  HIGH:   '#27AE60',
  MEDIUM: '#E67E22',
  LOW:    '#E74C3C',
}

// ── Hire recommendation classifier (mirrors report.service) ──
function getRecommendation(fit: number, trust: number): string {
  if (fit >= 80 && trust >= 80) return 'STRONG HIRE'
  if (fit >= 65 && trust >= 65) return 'HIRE'
  if (fit >= 50 && trust >= 50) return 'BORDERLINE'
  return 'NO HIRE'
}

// ── Custom tooltip ────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background:'var(--bg-elevated)', border:'1px solid var(--border)',
      borderRadius:8, padding:'10px 14px', fontSize:'0.82rem',
    }}>
      {label && <div style={{ fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ color: p.color || 'var(--text-secondary)', display:'flex', gap:8 }}>
          <span>{p.name}:</span>
          <span style={{ fontWeight:700 }}>{typeof p.value === 'number' ? p.value.toFixed(p.value % 1 === 0 ? 0 : 1) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [selectedCampaign, setSelectedCampaign] = useState<string>('ALL')
  const [activeTab, setActiveTab]               = useState<'overview'|'rounds'|'proctoring'|'comparison'>('overview')

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn:  campaignApi.getAll,
  })

  const campaignIds = selectedCampaign === 'ALL'
    ? (campaigns as any[]).map((c: any) => c.id)
    : [selectedCampaign]

  const { data: candidates = [], isLoading } = useQuery({
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

  // ── Core stats ────────────────────────────────────────────
  const totalInvited     = (candidates as any[]).filter((c: any) => c.status !== 'LOCKED').length
  const completed        = (candidates as any[]).filter((c: any) => ['COMPLETED','SHORTLISTED'].includes(c.status)).length
  const terminated       = (candidates as any[]).filter((c: any) => c.status === 'TERMINATED').length
  const scored           = (candidates as any[]).filter((c: any) => c.scorecard?.technicalFitPercent != null)
  const avgFit           = scored.length > 0
    ? scored.reduce((s: number, c: any) => s + (c.scorecard?.technicalFitPercent || 0), 0) / scored.length
    : 0
  const completionRate   = totalInvited > 0 ? (completed / totalInvited) * 100 : 0
  const terminationRate  = totalInvited > 0 ? (terminated / totalInvited) * 100 : 0

  // ── 1: Conversion funnel ──────────────────────────────────
  const funnel = useMemo(() => [
    { stage: 'Invited',    count: totalInvited },
    { stage: 'Started',    count: (candidates as any[]).filter((c: any) => ['IN_PROGRESS','COMPLETED','TERMINATED','SHORTLISTED','REJECTED'].includes(c.status)).length },
    { stage: 'Completed',  count: completed },
    { stage: 'Passed',     count: (candidates as any[]).filter((c: any) => (c.scorecard?.technicalFitPercent || 0) >= 60).length },
  ], [candidates, totalInvited, completed])

  // ── 2: Status distribution ────────────────────────────────
  const statusDist = useMemo(() => {
    const map: Record<string, number> = {}
    ;(candidates as any[]).forEach((c: any) => { map[c.status] = (map[c.status] || 0) + 1 })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [candidates])

  // ── 3: Round drop-off (NEW) ───────────────────────────────
  const roundDropoff = useMemo(() => {
    const map: Record<string, { type: string; started: number; passed: number; totalScore: number; count: number }> = {}
    ;(candidates as any[]).forEach((c: any) => {
      ;(c.attempts || []).forEach((a: any) => {
        const key = `${a.round?.order || 0}:${a.round?.roundType || 'Unknown'}`
        if (!map[key]) map[key] = { type: a.round?.roundType || 'Unknown', started: 0, passed: 0, totalScore: 0, count: 0 }
        map[key].started++
        if (a.passed) map[key].passed++
        if (a.percentScore != null) { map[key].totalScore += a.percentScore; map[key].count++ }
      })
      // Also from scorecard roundScores
      ;(c.scorecard?.roundScores || []).forEach((rs: any) => {
        const key = `${rs.roundOrder || 0}:${rs.roundType || 'Unknown'}`
        if (!map[key]) map[key] = { type: rs.roundType || 'Unknown', started: 0, passed: 0, totalScore: 0, count: 0 }
        if (!map[key].started) map[key].started++ // avoid double count
        if (rs.passed && !map[key].passed) map[key].passed++
        if (rs.percentScore != null) { map[key].totalScore += rs.percentScore; map[key].count++ }
      })
    })
    return Object.entries(map)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([key, v]) => ({
        round:   `R${key.split(':')[0]} ${v.type}`,
        started: v.started,
        passed:  v.passed,
        failed:  v.started - v.passed,
        avgScore:v.count > 0 ? v.totalScore / v.count : 0,
        passRate:v.started > 0 ? (v.passed / v.started) * 100 : 0,
      }))
  }, [candidates])

  // ── 4: Score distribution histogram (NEW) ────────────────
  const scoreDist = useMemo(() => {
    const buckets = [
      { range:'0–20%',  min:0,  max:20,  count:0 },
      { range:'20–40%', min:20, max:40,  count:0 },
      { range:'40–60%', min:40, max:60,  count:0 },
      { range:'60–80%', min:60, max:80,  count:0 },
      { range:'80–100%',min:80, max:101, count:0 },
    ]
    scored.forEach((c: any) => {
      const fit = c.scorecard?.technicalFitPercent || 0
      const b   = buckets.find(b => fit >= b.min && fit < b.max)
      if (b) b.count++
    })
    return buckets
  }, [scored])

  // ── 5: Proctoring violation breakdown (NEW) ───────────────
  const violationBreakdown = useMemo(() => {
    const map: Record<string, number> = {}
    ;(candidates as any[]).forEach((c: any) => {
      ;(c.strikeLog || []).forEach((s: any) => {
        map[s.violationType] = (map[s.violationType] || 0) + 1
      })
    })
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => ({ type: type.replace(/_/g, ' '), count }))
  }, [candidates])

  // ── 6: AI recommendation distribution (NEW) ──────────────
  const recDist = useMemo(() => {
    const map: Record<string, number> = { 'STRONG HIRE':0, 'HIRE':0, 'BORDERLINE':0, 'NO HIRE':0 }
    scored.forEach((c: any) => {
      const rec = getRecommendation(c.scorecard?.technicalFitPercent || 0, c.scorecard?.trustScore || 0)
      map[rec] = (map[rec] || 0) + 1
    })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [scored])

  // ── 7: Campaign comparison table (NEW) ───────────────────
  const campaignComparison = useMemo(() => {
    return (campaigns as any[]).map((camp: any) => {
      const cands        = (candidates as any[]).filter((c: any) => c.campaignId === camp.id)
      const inv          = cands.filter((c: any) => c.status !== 'LOCKED').length
      const comp         = cands.filter((c: any) => ['COMPLETED','SHORTLISTED'].includes(c.status)).length
      const term         = cands.filter((c: any) => c.status === 'TERMINATED').length
      const sc           = cands.filter((c: any) => c.scorecard?.technicalFitPercent != null)
      const avg          = sc.length > 0
        ? sc.reduce((s: number, c: any) => s + (c.scorecard.technicalFitPercent || 0), 0) / sc.length
        : null
      return {
        name:       camp.name,
        role:       camp.role,
        status:     camp.status,
        invited:    inv,
        completed:  comp,
        terminated: term,
        compRate:   inv > 0 ? (comp / inv) * 100 : 0,
        termRate:   inv > 0 ? (term / inv) * 100 : 0,
        avgFit:     avg,
      }
    }).filter((c: any) => c.invited > 0)
  }, [campaigns, candidates])

  // ── Top candidates ────────────────────────────────────────
  const topCandidates = useMemo(() => (candidates as any[])
    .filter((c: any) => c.scorecard?.technicalFitPercent)
    .sort((a: any, b: any) => (b.scorecard?.technicalFitPercent || 0) - (a.scorecard?.technicalFitPercent || 0))
    .slice(0, 10)
  , [candidates])

  const statCards = [
    { icon: Send,         label: 'Total Invitations', value: totalInvited,                    colorClass: 'orange' },
    { icon: CheckCircle,  label: 'Completion Rate',   value: `${completionRate.toFixed(1)}%`, colorClass: 'green'  },
    { icon: TrendingUp,   label: 'Average Fit %',     value: `${avgFit.toFixed(1)}%`,         colorClass: 'teal'   },
    { icon: XCircle,      label: 'Termination Rate',  value: `${terminationRate.toFixed(1)}%`,colorClass: 'red'    },
  ]

  const tabs = [
    { key: 'overview',    label: 'Overview'    },
    { key: 'rounds',      label: 'Round Analysis' },
    { key: 'proctoring',  label: 'Proctoring'  },
    { key: 'comparison',  label: 'Campaigns'   },
  ]

  return (
    <div className="fade-in">

      {/* Header */}
      <div className="section-header" style={{ marginBottom:24 }}>
        <div>
          <h1 style={{ marginBottom:4 }}>
            <span style={{ color:'var(--orange)' }}>Analytics</span>
          </h1>
          <p className="section-subtitle">Performance metrics across your campaigns</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Filter size={14} style={{ color:'var(--text-muted)' }} />
          <select className="form-select" style={{ minWidth:220 }}
            value={selectedCampaign} onChange={e => setSelectedCampaign(e.target.value)}>
            <option value="ALL">All Campaigns</option>
            {(campaigns as any[]).map((c: any) => (
              <option key={c.id} value={c.id}>{c.name} — {c.role}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-4" style={{ marginBottom:24 }}>
        {statCards.map(s => (
          <div key={s.label} className="stat-card">
            <div className={`stat-icon ${s.colorClass}`}><s.icon size={22} /></div>
            <div className="stat-info">
              <div className="stat-value">{isLoading ? '—' : s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom:20 }}>
        {tabs.map(t => (
          <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key as any)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────────── */}
      {activeTab === 'overview' && (
        <>
          <div className="grid-2" style={{ gap:20, marginBottom:20 }}>

            {/* Conversion funnel */}
            <div className="card">
              <h3 style={{ fontSize:'0.95rem', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                <BarChart3 size={17} style={{ color:'var(--orange)' }} /> Conversion Funnel
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={funnel} margin={{ left:-10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="stage" tick={{ fill:'var(--text-secondary)', fontSize:12 }} />
                  <YAxis tick={{ fill:'var(--text-muted)', fontSize:11 }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Candidates" fill="#fb851e" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Status distribution */}
            <div className="card">
              <h3 style={{ fontSize:'0.95rem', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                <PieChartIcon size={17} style={{ color:'var(--teal)' }} /> Status Distribution
              </h3>
              {statusDist.length === 0
                ? <div className="empty-state" style={{ padding:'40px 0' }}><div className="empty-desc">No candidates yet</div></div>
                : (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={statusDist} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={85} innerRadius={42} paddingAngle={2}>
                        {statusDist.map((_e, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize:'0.72rem', color:'var(--text-secondary)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )
              }
            </div>
          </div>

          <div className="grid-2" style={{ gap:20, marginBottom:20 }}>

            {/* Score distribution histogram */}
            <div className="card">
              <h3 style={{ fontSize:'0.95rem', marginBottom:4, display:'flex', alignItems:'center', gap:8 }}>
                <Target size={17} style={{ color:'var(--teal)' }} /> Score Distribution
              </h3>
              <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:14 }}>
                Technical Fit % across {scored.length} scored candidates
              </p>
              {scoreDist.every(b => b.count === 0)
                ? <div className="empty-state" style={{ padding:'30px 0' }}><div className="empty-desc">No scored candidates yet</div></div>
                : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={scoreDist} margin={{ left:-10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="range" tick={{ fill:'var(--text-secondary)', fontSize:11 }} />
                      <YAxis tick={{ fill:'var(--text-muted)', fontSize:11 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="count" name="Candidates" radius={[4,4,0,0]}>
                        {scoreDist.map((b, i) => (
                          <Cell key={i} fill={
                            b.min >= 80 ? '#27AE60' :
                            b.min >= 60 ? '#23979C' :
                            b.min >= 40 ? '#E67E22' : '#E74C3C'
                          } />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )
              }
            </div>

            {/* AI Recommendation distribution */}
            <div className="card">
              <h3 style={{ fontSize:'0.95rem', marginBottom:4, display:'flex', alignItems:'center', gap:8 }}>
                <TrendingUp size={17} style={{ color:'var(--orange)' }} /> AI Hiring Recommendations
              </h3>
              <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:14 }}>
                Pipeline health across {scored.length} assessed candidates
              </p>
              {recDist.every(r => r.value === 0)
                ? <div className="empty-state" style={{ padding:'30px 0' }}><div className="empty-desc">No scored candidates yet</div></div>
                : (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={recDist.filter(r => r.value > 0)} dataKey="value" nameKey="name"
                          cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={2}>
                          {recDist.filter(r => r.value > 0).map((r, i) => (
                            <Cell key={i} fill={REC_COLORS[r.name] || '#aaa'} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:8, justifyContent:'center' }}>
                      {recDist.filter(r => r.value > 0).map(r => (
                        <div key={r.name} style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.78rem' }}>
                          <div style={{ width:10, height:10, borderRadius:2, background: REC_COLORS[r.name] || '#aaa' }} />
                          <span style={{ color:'var(--text-secondary)' }}>{r.name}</span>
                          <span style={{ fontWeight:700, color: REC_COLORS[r.name] }}>{r.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )
              }
            </div>
          </div>

          {/* Top candidates table */}
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <div style={{ padding:'16px 20px 12px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
              <TrendingUp size={17} style={{ color:'var(--orange)' }} />
              <div>
                <h3 style={{ fontSize:'0.95rem' }}>Top Candidates</h3>
                <p style={{ color:'var(--text-secondary)', fontSize:'0.72rem', marginTop:2 }}>Ranked by Technical Fit %</p>
              </div>
            </div>
            {topCandidates.length === 0
              ? <div className="empty-state" style={{ padding:'40px 20px' }}><div className="empty-title">No scored candidates yet</div></div>
              : (
                <div className="table-wrap" style={{ border:'none', borderRadius:0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>#</th><th>Candidate</th><th>Campaign</th>
                        <th>Fit %</th><th>Trust</th><th>Recommendation</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topCandidates.map((c: any, i: number) => {
                        const fit   = Math.round(c.scorecard?.technicalFitPercent || 0)
                        const trust = Math.round(c.scorecard?.trustScore || 100)
                        const rec   = getRecommendation(fit, trust)
                        return (
                          <tr key={c.id}>
                            <td style={{ fontWeight:700, color: i < 3 ? 'var(--orange)' : 'var(--text-muted)' }}>{i + 1}</td>
                            <td>
                              <div style={{ fontWeight:600, color:'var(--cream)', fontSize:'0.88rem' }}>
                                {c.user?.firstName} {c.user?.lastName}
                              </div>
                              <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{c.user?.email}</div>
                            </td>
                            <td style={{ fontSize:'0.82rem', color:'var(--text-secondary)' }}>
                              {(campaigns as any[]).find((cp: any) => cp.id === c.campaignId)?.name || '—'}
                            </td>
                            <td style={{ fontWeight:700, color: fit >= 70 ? 'var(--green-dark)' : fit >= 50 ? 'var(--orange)' : 'var(--red)' }}>
                              {fit}%
                            </td>
                            <td style={{ fontWeight:600, color: trust >= 80 ? 'var(--green-dark)' : 'var(--orange)' }}>{trust}</td>
                            <td>
                              <span style={{
                                fontSize:'0.68rem', fontWeight:700, padding:'3px 8px', borderRadius:20,
                                background: (REC_COLORS[rec] || '#aaa') + '22',
                                color: REC_COLORS[rec] || '#aaa',
                                border: `1px solid ${(REC_COLORS[rec] || '#aaa')}44`,
                              }}>
                                {rec}
                              </span>
                            </td>
                            <td><span className="badge badge-muted">{c.status}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        </>
      )}

      {/* ── ROUND ANALYSIS TAB ─────────────────────────────── */}
      {activeTab === 'rounds' && (
        <>
          <div className="card" style={{ marginBottom:20 }}>
            <h3 style={{ fontSize:'0.95rem', marginBottom:4, display:'flex', alignItems:'center', gap:8 }}>
              <BarChart3 size={17} style={{ color:'var(--orange)' }} /> Round Drop-off Analysis
            </h3>
            <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:16 }}>
              How many candidates started vs passed each round. Identify bottlenecks.
            </p>
            {roundDropoff.length === 0
              ? <div className="empty-state"><div className="empty-desc">No round data available yet</div></div>
              : (
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={roundDropoff} margin={{ left:-10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="round" tick={{ fill:'var(--text-secondary)', fontSize:11 }} />
                    <YAxis yAxisId="left" tick={{ fill:'var(--text-muted)', fontSize:11 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill:'var(--text-muted)', fontSize:11 }}
                      tickFormatter={(v) => `${v.toFixed(0)}%`} domain={[0, 100]} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize:'0.72rem', color:'var(--text-secondary)' }} />
                    <Bar yAxisId="left" dataKey="started" name="Started"  fill="#23979C" radius={[4,4,0,0]} opacity={0.7} />
                    <Bar yAxisId="left" dataKey="passed"  name="Passed"   fill="#27AE60" radius={[4,4,0,0]} />
                    <Line yAxisId="right" type="monotone" dataKey="passRate" name="Pass Rate %" stroke="#FB851E" strokeWidth={2} dot={{ fill:'#FB851E', r:4 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )
            }
          </div>

          {/* Round stats table */}
          {roundDropoff.length > 0 && (
            <div className="card" style={{ padding:0, overflow:'hidden' }}>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)' }}>
                <h3 style={{ fontSize:'0.92rem' }}>Round Performance Summary</h3>
              </div>
              <div className="table-wrap" style={{ border:'none', borderRadius:0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Round</th><th>Started</th><th>Passed</th>
                      <th>Failed</th><th>Pass Rate</th><th>Avg Score</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roundDropoff.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight:600, color:'var(--cream)' }}>{r.round}</td>
                        <td style={{ color:'var(--text-secondary)' }}>{r.started}</td>
                        <td style={{ color:'var(--green-dark)', fontWeight:600 }}>{r.passed}</td>
                        <td style={{ color:'var(--red)', fontWeight:600 }}>{r.failed}</td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ flex:1, height:6, background:'var(--border)', borderRadius:3, overflow:'hidden', minWidth:60 }}>
                              <div style={{ height:'100%', borderRadius:3, background: r.passRate >= 60 ? 'var(--green-dark)' : r.passRate >= 40 ? 'var(--orange)' : 'var(--red)', width:`${r.passRate}%` }} />
                            </div>
                            <span style={{ fontWeight:700, color: r.passRate >= 60 ? 'var(--green-dark)' : r.passRate >= 40 ? 'var(--orange)' : 'var(--red)', fontSize:'0.85rem', minWidth:36 }}>
                              {r.passRate.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td style={{ fontWeight:600, color:'var(--text-primary)' }}>{r.avgScore.toFixed(1)}%</td>
                        <td>
                          {r.passRate >= 70
                            ? <span className="badge badge-success">Healthy</span>
                            : r.passRate >= 40
                            ? <span className="badge badge-warning">Review</span>
                            : <span className="badge badge-danger">Too Hard</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding:'10px 20px', background:'var(--bg-elevated)', fontSize:'0.75rem', color:'var(--text-muted)', borderTop:'1px solid var(--border)' }}>
                💡 If Pass Rate is below 40%, consider reducing the pass mark or regenerating the question pool for that round.
              </div>
            </div>
          )}
        </>
      )}

      {/* ── PROCTORING TAB ────────────────────────────────── */}
      {activeTab === 'proctoring' && (
        <>
          <div className="grid-2" style={{ gap:20, marginBottom:20 }}>

            {/* Violation breakdown chart */}
            <div className="card">
              <h3 style={{ fontSize:'0.95rem', marginBottom:4, display:'flex', alignItems:'center', gap:8 }}>
                <ShieldAlert size={17} style={{ color:'var(--red)' }} /> Violation Types
              </h3>
              <p style={{ fontSize:'0.75rem', color:'var(--text-muted)', marginBottom:14 }}>
                Total violations detected across all sessions
              </p>
              {violationBreakdown.length === 0
                ? <div className="empty-state" style={{ padding:'40px 0' }}><div className="empty-desc">No violations recorded</div></div>
                : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={violationBreakdown} layout="vertical" margin={{ left:10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" tick={{ fill:'var(--text-muted)', fontSize:11 }} />
                      <YAxis type="category" dataKey="type" tick={{ fill:'var(--text-secondary)', fontSize:10 }} width={110} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="count" name="Count" fill="#E74C3C" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )
              }
            </div>

            {/* Proctoring stats */}
            <div className="card">
              <h3 style={{ fontSize:'0.95rem', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                <ShieldAlert size={17} style={{ color:'var(--orange)' }} /> Proctoring Summary
              </h3>
              {(() => {
                const allStrikes    = (candidates as any[]).flatMap((c: any) => c.strikeLog || [])
                const realStrikes   = allStrikes.filter((s: any) => s.isStrike)
                const flags         = allStrikes.filter((s: any) => !s.isStrike)
                const terminated    = (candidates as any[]).filter((c: any) => c.status === 'TERMINATED').length
                const clean         = (candidates as any[]).filter((c: any) => !(c.strikeLog?.length > 0) && c.status !== 'LOCKED').length
                const stats = [
                  { label:'Total Strikes Issued',  value: realStrikes.length, color:'var(--red)'       },
                  { label:'Flags (non-strike)',     value: flags.length,       color:'var(--orange)'    },
                  { label:'Sessions Terminated',   value: terminated,          color:'var(--red)'       },
                  { label:'Clean Sessions',         value: clean,              color:'var(--green-dark)'},
                  { label:'Avg Strikes per Session',value: (candidates as any[]).filter((c:any) => c.status !== 'LOCKED').length > 0
                    ? (realStrikes.length / Math.max(1, (candidates as any[]).filter((c:any) => c.status !== 'LOCKED').length)).toFixed(1)
                    : '0', color:'var(--teal)' },
                ]
                return (
                  <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {stats.map(s => (
                      <div key={s.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', background:'var(--bg-elevated)', borderRadius:8, border:'1px solid var(--border)' }}>
                        <span style={{ fontSize:'0.85rem', color:'var(--text-secondary)' }}>{s.label}</span>
                        <span style={{ fontWeight:800, fontSize:'1.1rem', color:s.color }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        </>
      )}

      {/* ── CAMPAIGN COMPARISON TAB ───────────────────────── */}
      {activeTab === 'comparison' && (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'16px 20px 12px', borderBottom:'1px solid var(--border)' }}>
            <h3 style={{ fontSize:'0.95rem' }}>Campaign Comparison</h3>
            <p style={{ fontSize:'0.75rem', color:'var(--text-secondary)', marginTop:3 }}>
              Side-by-side performance across all active campaigns
            </p>
          </div>
          {campaignComparison.length === 0
            ? <div className="empty-state" style={{ padding:'60px 20px' }}>
                <div className="empty-icon">📊</div>
                <div className="empty-title">No campaign data yet</div>
                <div className="empty-desc">Campaigns need active candidates to appear here</div>
              </div>
            : (
              <>
                <div className="table-wrap" style={{ border:'none', borderRadius:0 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Campaign</th><th>Status</th><th>Invited</th>
                        <th>Completed</th><th>Completion Rate</th>
                        <th>Termination Rate</th><th>Avg Fit %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignComparison.map((c, i) => (
                        <tr key={i}>
                          <td>
                            <div style={{ fontWeight:600, color:'var(--cream)', fontSize:'0.88rem' }}>{c.name}</div>
                            <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>{c.role}</div>
                          </td>
                          <td>
                            <span className={`badge ${c.status === 'ACTIVE' ? 'badge-success' : c.status === 'PAUSED' ? 'badge-warning' : 'badge-muted'}`}>
                              {c.status}
                            </span>
                          </td>
                          <td style={{ fontWeight:600 }}>{c.invited}</td>
                          <td style={{ color:'var(--green-dark)', fontWeight:600 }}>{c.completed}</td>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{ flex:1, height:6, background:'var(--border)', borderRadius:3, overflow:'hidden', minWidth:60 }}>
                                <div style={{ height:'100%', borderRadius:3, background: c.compRate >= 60 ? 'var(--green-dark)' : c.compRate >= 30 ? 'var(--orange)' : 'var(--red)', width:`${c.compRate}%` }} />
                              </div>
                              <span style={{ fontWeight:700, fontSize:'0.85rem', minWidth:36, color: c.compRate >= 60 ? 'var(--green-dark)' : c.compRate >= 30 ? 'var(--orange)' : 'var(--red)' }}>
                                {c.compRate.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td style={{ fontWeight:600, color: c.termRate > 20 ? 'var(--red)' : c.termRate > 10 ? 'var(--orange)' : 'var(--green-dark)' }}>
                            {c.termRate.toFixed(1)}%
                          </td>
                          <td style={{ fontWeight:700, color: c.avgFit == null ? 'var(--text-muted)' : c.avgFit >= 70 ? 'var(--green-dark)' : c.avgFit >= 50 ? 'var(--orange)' : 'var(--red)' }}>
                            {c.avgFit != null ? `${c.avgFit.toFixed(1)}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ padding:'10px 20px', background:'var(--bg-elevated)', fontSize:'0.75rem', color:'var(--text-muted)', borderTop:'1px solid var(--border)' }}>
                  💡 Completion Rate below 30% may indicate the assessment is too long or the pass marks are too strict.
                  Termination Rate above 20% may indicate proctoring rules need calibration.
                </div>
              </>
            )
          }
        </div>
      )}
    </div>
  )
}