import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { adminApi, campaignApi } from '../../services/api.services'
import {
  Briefcase, Users, Activity, Plus, TrendingUp,
  CheckCircle, X, Filter, BarChart3, ShieldAlert,
  Calendar, Layers, ChevronRight
} from 'lucide-react'
import { 
  Tooltip, ResponsiveContainer, 
  FunnelChart, Funnel, LabelList
} from 'recharts'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'badge-success', DRAFT: 'badge-warning', PAUSED: 'badge-danger',
  CLOSED: 'badge-muted', ARCHIVED: 'badge-muted',
}

const RANGE_OPTIONS = [
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 90 Days', value: '90d' },
  { label: 'All Time', value: 'all' },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [dateRange, setDateRange] = useState('all')

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-dashboard', dateRange],
    queryFn: adminApi.getDashboard,
  })

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignApi.getAll,
  })

  // Rejection modal state
  const [rejectTarget, setRejectTarget] = useState<any>(null)
  const [rejectReason, setRejectReason] = useState('')

  const advanceMutation = useMutation({
    mutationFn: (candidateId: string) => adminApi.advanceRound(candidateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
      toast.success('Candidate advanced to next round!')
    },
    onError: () => toast.error('Failed to advance candidate'),
  })

  const rejectMutation = useMutation({
    mutationFn: ({ candidateId, reason }: { candidateId: string; reason?: string }) =>
      adminApi.rejectCandidate(candidateId, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] })
      setRejectTarget(null)
      setRejectReason('')
      toast.success('Candidate rejected')
    },
    onError: () => toast.error('Failed to reject candidate'),
  })

  const pending = stats?.pendingDecisions || []

  // Metrics mapping
  const funnelData = useMemo(() => {
    if (!stats?.funnel) return []
    const f = stats.funnel
    return [
      { name: 'Invited', value: f.invited, fill: '#64748b' },
      { name: 'In Progress', value: f.inProgress, fill: '#0fbdb8' },
      { name: 'Completed', value: f.completed, fill: '#fb851e' },
      { name: 'Shortlisted', value: f.shortlisted, fill: '#23979c' },
    ]
  }, [stats])

  const statCards = [
    { icon: Briefcase, label: 'Total Campaigns', value: stats?.totalCampaigns, colorClass: 'orange', trend: '+12%' },
    { icon: Activity,  label: 'Active Campaigns', value: stats?.activeCampaigns, colorClass: 'teal', trend: 'Stable' },
    { icon: Users,     label: 'Total Candidates', value: stats?.totalCandidates, colorClass: 'green', trend: '+5.4%' },
    { icon: ShieldAlert, label: 'Proctoring Strikes', value: stats?.totalStrikes, colorClass: 'red', trend: '-2%' },
  ]

  const recentCampaigns = campaigns.slice(0, 5)

  return (
    <div className="fade-in enterprise-dashboard" style={{ paddingBottom: '60px' }}>
      
      {/* ── Top Bar / Global Actions ──────────────────── */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        marginBottom: '32px', flexWrap: 'wrap', gap: '20px'
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '6px' }}>
            System <span style={{ color: 'var(--orange)' }}>Overview</span>
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} /> Last updated: {new Date().toLocaleTimeString()}
            </span>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--border)' }} />
            <span style={{ fontSize: '0.82rem', color: 'var(--teal)', fontWeight: 600 }}>Platform Live</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="filter-group" style={{ 
            background: 'var(--bg-elevated)', border: '1px solid var(--border)', 
            padding: '4px', borderRadius: 'var(--radius-lg)', display: 'flex' 
          }}>
            {RANGE_OPTIONS.map(opt => (
              <button 
                key={opt.value}
                onClick={() => setDateRange(opt.value)}
                style={{
                  padding: '6px 14px', borderRadius: 'var(--radius-md)', fontSize: '0.75rem', fontWeight: 600,
                  background: dateRange === opt.value ? 'var(--grad-primary)' : 'transparent',
                  color: dateRange === opt.value ? 'white' : 'var(--text-secondary)',
                  border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/admin/campaigns/new')} style={{ boxShadow: 'var(--shadow-orange)' }}>
            <Plus size={16} /> New Campaign
          </button>
        </div>
      </div>

      {/* ── Key Metrics Grid ───────────────────────────── */}
      <div className="grid-4" style={{ marginBottom: '32px', gap: '20px' }}>
        {statCards.map((s) => (
          <div key={s.label} className="card metrics-card h-full" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, padding: '16px', opacity: 0.05 }}>
              <s.icon size={64} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div className={`stat-icon-premium ${s.colorClass}`} style={{ 
                width: '42px', height: '42px', borderRadius: '12px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <s.icon size={20} />
              </div>
              <span style={{ 
                fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: '20px',
                background: s.trend.startsWith('+') ? 'rgba(15,189,184,0.1)' : 'rgba(251,133,30,0.1)',
                color: s.trend.startsWith('+') ? 'var(--teal)' : 'var(--orange)'
              }}>
                {s.trend}
              </span>
            </div>
            <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {statsLoading ? <div className="skeleton" style={{ width: '60%', height: '32px' }} /> : (s.value ?? 0)}
            </div>
            <div className="stat-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-3" style={{ gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px', alignItems: 'start' }}>
        
        {/* ── Decision Queue + Funnel ─────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Funnel & Distribution Chart */}
          <div className="card h-full" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} style={{ color: 'var(--orange)' }} /> Candidate Pipeline Funnel
              </h3>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span className="badge badge-muted">Conversion: {stats?.funnel ? Math.round((stats.funnel.shortlisted/stats.funnel.invited)*100) : 0}%</span>
              </div>
            </div>
            <div style={{ height: '300px', width: '100%', minWidth: 0, minHeight: 0 }}>
              {funnelData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                  <FunnelChart>
                    <Tooltip 
                      contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Funnel
                      dataKey="value"
                      data={funnelData}
                      isAnimationActive
                    >
                      <LabelList position="right" fill="var(--text-secondary)" stroke="none" dataKey="name" />
                    </Funnel>
                  </FunnelChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No funnel data available for this range
                </div>
              )}
            </div>
          </div>

          {/* Pending Decisions Section */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Decision Queue</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '2px' }}>Manual reviews required for round transitions</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/candidates-management')}>
                Advanced Filter <Filter size={14} />
              </button>
            </div>

            {statsLoading ? (
              <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" /></div>
            ) : pending.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center' }}>
                <div style={{ marginBottom: '16px', opacity: 0.2 }}><CheckCircle size={48} /></div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Queue is empty</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>All candidate evaluations are up to date.</div>
              </div>
            ) : (
              <div className="table-wrap" style={{ border: 'none' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '12px 24px' }}>Candidate Details</th>
                      <th>Metrics</th>
                      <th style={{ textAlign: 'right', paddingRight: '24px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.slice(0, 6).map((d: any) => (
                      <tr key={d.candidateId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{d.name}</div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
                            {d.campaignName} · <span style={{ color: 'var(--orange)' }}>{d.reason}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ 
                              width: '45px', textAlign: 'center', padding: '4px', borderRadius: '6px',
                              background: (d.percentScore || 0) >= (d.passMarkPercent || 60) ? 'rgba(15,189,184,0.1)' : 'rgba(251,133,30,0.1)'
                            }}>
                              <div style={{ 
                                fontWeight: 800, fontSize: '0.85rem',
                                color: (d.percentScore || 0) >= (d.passMarkPercent || 60) ? 'var(--teal)' : 'var(--orange)'
                              }}>
                                {Math.round(d.percentScore || 0)}%
                              </div>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              Goal: {d.passMarkPercent}%
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', paddingRight: '24px' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => advanceMutation.mutate(d.candidateId)} title="Approve Entry">
                              Adv. Round
                            </button>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setRejectTarget(d)} title="Reject">
                              <X size={15} style={{ color: 'var(--red)' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {pending.length > 6 && (
                  <div style={{ textAlign: 'center', padding: '12px' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/candidates-management')}>
                      View all {pending.length} pending decisions <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar Contextual Cards ───────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Quick Stats Search */}
          <div className="card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} style={{ color: 'var(--orange)' }} /> Performance Pulse
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Completion Rate</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{stats?.funnel ? Math.round((stats.funnel.completed/stats.funnel.invited)*100) : 0}%</span>
              </div>
              <div className="progress-bg" style={{ height: '6px', background: 'var(--bg-elevated)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${stats?.funnel ? (stats.funnel.completed/stats.funnel.invited)*100 : 0}%`, 
                  height: '100%', background: 'var(--grad-primary)' 
                }} />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '6px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Shortlist Ratio</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{stats?.funnel ? Math.round((stats.funnel.shortlisted/stats.funnel.completed || 1)*100) : 0}%</span>
              </div>
              <div className="progress-bg" style={{ height: '6px', background: 'var(--bg-elevated)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${stats?.funnel ? (stats.funnel.shortlisted/stats.funnel.completed||1)*100 : 0}%`, 
                  height: '100%', background: 'var(--teal)' 
                }} />
              </div>
            </div>
          </div>

          {/* Activity Feed / Recent Campaigns */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700 }}>Recent Campaigns</h4>
            </div>
            <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
              {recentCampaigns.map((camp: any) => (
                <div 
                  key={camp.id} 
                  className="campaign-item-hover"
                  onClick={() => navigate(`/admin/campaigns/${camp.id}`)}
                  style={{ 
                    padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', 
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{camp.name}</div>
                    <span className={`badge ${STATUS_COLORS[camp.status] || 'badge-muted'}`} style={{ fontSize: '0.6rem' }}>{camp.status}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span>{camp.role}</span>
                    <span>{camp._count?.candidates || 0} candidates</span>
                  </div>
                </div>
              ))}
              <div style={{ padding: '12px', textAlign: 'center' }}>
                <button className="btn btn-ghost btn-sm w-full" onClick={() => navigate('/admin/campaigns')}>
                  Manage all Campaigns
                </button>
              </div>
            </div>
          </div>

          {/* Quick Operational Links */}
          <div className="card" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(251,133,30,0.05) 0%, rgba(35,151,156,0.05) 100%)' }}>
             <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '14px' }}>Talent Ops Control</h4>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                <button className="btn btn-outline btn-sm" style={{ justifyContent: 'flex-start', background: 'var(--bg-card)' }} onClick={() => navigate('/admin/candidates-management')}>
                  <Users size={14} /> Full Talent Roster
                </button>
                <button className="btn btn-outline btn-sm" style={{ justifyContent: 'flex-start', background: 'var(--bg-card)' }} onClick={() => navigate('/admin/live-monitor')}>
                  <Activity size={14} /> Real-time Monitoring
                </button>
                <button className="btn btn-outline btn-sm" style={{ justifyContent: 'flex-start', background: 'var(--bg-card)' }} onClick={() => navigate('/admin/reports')}>
                  <BarChart3 size={14} /> Compliance Reports
                </button>
             </div>
          </div>

        </div>
      </div>

      {/* ── Reject Confirmation Modal ─────────────────── */}
      {rejectTarget && (
        <div className="modal-overlay" onClick={() => setRejectTarget(null)}>
          <div className="modal modal-sm fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title" style={{ color: 'var(--red)' }}>Reject Candidate</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Confirm rejection for <strong>{rejectTarget.name}</strong>.
                </p>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setRejectTarget(null)}><X size={18} /></button>
            </div>

            <div className="form-group" style={{ marginTop: '12px' }}>
              <label className="form-label">Review Note (optional)</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Reason for manual rejection..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setRejectTarget(null)}>Cancel</button>
              <button
                className="btn btn-primary btn-sm"
                style={{ background: 'var(--red)' }}
                disabled={rejectMutation.isPending}
                onClick={() => rejectMutation.mutate({
                  candidateId: rejectTarget.candidateId,
                  reason: rejectReason || undefined
                })}
              >
                {rejectMutation.isPending ? 'Processing...' : 'Reject Candidate'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .enterprise-dashboard .card {
          border: 1px solid var(--border);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .enterprise-dashboard .metrics-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
          border-color: rgba(251,133,30,0.3);
        }
        .stat-icon-premium.orange { background: rgba(251,133,30,0.15); color: var(--orange); }
        .stat-icon-premium.teal { background: rgba(15,189,184,0.15); color: var(--teal); }
        .stat-icon-premium.green { background: rgba(34,197,94,0.15); color: #22c55e; }
        .stat-icon-premium.red { background: rgba(239,68,68,0.15); color: #ef4444; }
        
        .campaign-item-hover:hover {
          background: rgba(251,133,30,0.04) !important;
        }
      `}</style>
    </div>
  )
}
