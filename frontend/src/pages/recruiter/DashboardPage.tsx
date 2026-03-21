import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { recruiterApi } from '../../services/api.services'
import {
  Users, UserCheck, Clock, Activity, Star, Eye,
  ArrowRight
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { PieChart, Pie, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis } from 'recharts'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['recruiter', 'dashboard-stats'],
    queryFn: recruiterApi.getDashboardStats,
  })

  // Dummy stat to give visual flair if data is completely empty (first day)
  const isFirstDay = !isLoading && data?.summary?.total === 0

  return (
    <div className="fade-in">
      <div className="section-header">
        <div>
          <h1 style={{ marginBottom: '4px' }}>
            <span style={{ color: 'var(--orange)' }}>Hi, {user?.firstName}</span>
          </h1>
          <p className="section-subtitle">
            Here's what's happening across your recruiting campaigns today.
          </p>
        </div>
        {!isFirstDay && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-outline" onClick={() => navigate('/recruiter/candidates')}>
              View All Candidates
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/recruiter/monitor')}>
              <Activity size={15} /> Live Monitor
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', alignItems: 'center', color: 'var(--text-secondary)' }}>
          <div className="spinner" /> Loading dashboard...
        </div>
      ) : isFirstDay ? (
        <div className="empty-state">
          <div className="empty-icon"><Activity size={40} style={{ opacity: 0.3 }} /></div>
          <div className="empty-title">Welcome to SmartHire</div>
          <div className="empty-desc">Your dashboard is empty because you haven't been assigned any campaigns yet, or no candidates have been added.</div>
          <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/recruiter/candidates')}>
            Start Exploring
          </button>
        </div>
      ) : (
        <>
          {/* STATS ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            {(
            [
              {
                label: 'Total Candidates',
                value: data?.summary?.total || 0,
                icon: Users,
                color: 'var(--teal)',
                bg: 'var(--teal-soft)',
                pulsing: false,
              },
              {
                label: 'In Progress',
                value: data?.summary?.active || 0,
                icon: Activity,
                color: 'var(--orange)',
                bg: 'var(--orange-soft)',
                pulsing: (data?.summary?.active ?? 0) > 0,
              },
              {
                label: 'Pending Onboarding',
                value: data?.summary?.pending || 0,
                icon: Clock,
                color: 'var(--text-secondary)',
                bg: 'var(--bg-hover)',
                pulsing: false,
              },
              {
                label: 'Interviews Completed',
                value: data?.summary?.completed || 0,
                icon: UserCheck,
                color: 'var(--green-dark)',
                bg: 'var(--green-soft)',
                pulsing: false,
              },
              {
                label: 'Shortlisted',
                value: data?.summary?.shortlisted || 0,
                icon: Star,
                color: 'var(--primary)',
                bg: 'var(--primary-soft)',
                pulsing: false,
              },
            ] as { label: string; value: number; icon: React.FC<{ size: number }>; color: string; bg: string; pulsing: boolean }[]
          ).map((stat, i) => (
              <div key={i} className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-surface)' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: stat.bg, color: stat.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: stat.pulsing ? 'pulseBadge 2s infinite' : 'none'
                }}>
                  <stat.icon size={22} />
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--cream)', lineHeight: '1.2' }}>{stat.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'stretch' }}>
            
            {/* CHARTS COLUMN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              <div className="card" style={{ flex: '1', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '20px', color: 'var(--cream)' }}>Pipeline Funnel</h3>
                <div style={{ flex: '1', minHeight: '220px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Invited & Pending', value: data?.summary?.pending || 0, fill: 'var(--text-muted)' },
                        { name: 'Live', value: data?.summary?.active || 0, fill: 'var(--orange)' },
                        { name: 'Completed', value: data?.summary?.completed || 0, fill: 'var(--teal)' },
                        { name: 'Shortlisted', value: data?.summary?.shortlisted || 0, fill: 'var(--primary)' },
                      ]}
                      layout="vertical"
                      margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={130} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card" style={{ flex: '1' }}>
                 <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '20px', color: 'var(--cream)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   Candidate Distribution
                 </h3>
                 <div style={{ height: '200px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Locked', value: data?.summary?.pending - (data?.summary?.pending / 2) || 0, fill: 'var(--bg-hover)' },
                          { name: 'Onboarding', value: data?.summary?.pending / 2 || 0, fill: 'var(--teal)' },
                          { name: 'In Progress', value: data?.summary?.active || 0, fill: 'var(--orange)' },
                          { name: 'Evaluated', value: data?.summary?.completed + data?.summary?.shortlisted || 0, fill: 'var(--primary)' },
                        ].filter(d => d.value > 0)}
                        cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value"
                      />
                      <RechartsTooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                 </div>
              </div>
            </div>

            {/* RECENT CANDIDATES COLUMN */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--cream)' }}>Ready for Review</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/recruiter/candidates')}>
                  View All <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                </button>
              </div>

              {data?.recentCandidates?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                  <div style={{ margin: '0 auto 12px', width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CheckCircle size={24} style={{ opacity: 0.5 }} />
                  </div>
                  <p>All caught up! No recent candidates.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {data?.recentCandidates?.map((c: any) => {
                    const fitScore = Math.round(c.scorecard?.technicalFitPercent || 0)
                    const showBadge = ['COMPLETED', 'TERMINATED', 'SHORTLISTED'].includes(c.status)
                    return (
                      <div key={c.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px',
                        borderRadius: 'var(--radius-md)', background: 'var(--bg-base)', border: '1px solid var(--border)',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                           <div style={{
                              width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                              background: 'var(--grad-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.8rem', fontWeight: 700, color: '#fff'
                            }}>
                              {c.user.firstName[0]}{c.user.lastName[0]}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--cream)', fontSize: '0.9rem' }}>
                                {c.user.firstName} {c.user.lastName}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {c.campaign?.name} — {c.campaign?.role}
                              </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                           {showBadge && (
                             <div style={{ textAlign: 'right' }}>
                               <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Fit Score</div>
                               <div style={{ fontSize: '1.05rem', fontWeight: 800, color: fitScore >= 70 ? 'var(--green-dark)' : 'var(--orange)' }}>
                                 {fitScore}%
                               </div>
                             </div>
                           )}
                           <button className="btn btn-primary btn-sm btn-icon" onClick={() => navigate(`/recruiter/scorecard/${c.id}`)}>
                             <Eye size={15} />
                           </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            
          </div>
        </>
      )}
    </div>
  )
}

function CheckCircle(props: any) {
  return (
    <svg width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
