import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { campaignApi, questionApi, recruiterApi, adminApi } from '../../services/api.services'
import {
  ArrowLeft, Zap, Play, Pause, Eye, Trash2,
  X, UserPlus, Lock
} from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'badge-success', DRAFT: 'badge-warning', PAUSED: 'badge-danger',
  CLOSED: 'badge-muted', ARCHIVED: 'badge-muted',
}
const C_STATUS: Record<string, string> = {
  LOCKED: 'badge-muted', INVITED: 'badge-warning', ONBOARDING: 'badge-teal',
  READY: 'badge-success', IN_PROGRESS: 'badge-warning',
  COMPLETED: 'badge-success', TERMINATED: 'badge-danger',
  SHORTLISTED: 'badge-success', REJECTED: 'badge-danger',
}
const ROUND_EMOJI: Record<string, string> = { MCQ: '📝', CODING: '💻', INTERVIEW: '🎙️', MIXED: '🧩' }
const TABS = ['Overview', 'Candidates', 'Rounds', 'Recruiters'] as const

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<typeof TABS[number]>('Overview')
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const { data: camp, isLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignApi.getOne(id!),
    enabled: !!id,
  })

  const { data: candidates = [] } = useQuery({
    queryKey: ['campaign-candidates', id],
    queryFn: () => recruiterApi.getCandidates(id!),
    enabled: !!id && tab === 'Candidates',
  })

  const { data: allRecruiters = [] } = useQuery({
    queryKey: ['admin-recruiters'],
    queryFn: adminApi.getAllRecruiters,
    enabled: showAssignModal,
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => campaignApi.updateStatus(id!, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaign', id] }); toast.success('Status updated') },
    onError: () => toast.error('Failed to update status'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => campaignApi.delete(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campaign deleted'); navigate('/admin/campaigns') },
    onError: () => toast.error('Failed to delete'),
  })

  const generateMutation = useMutation({
    mutationFn: () => questionApi.generatePool(id!),
    onSuccess: () => toast.success('AI question generation started!'),
    onError: () => toast.error('Generation failed'),
  })

  const assignMutation = useMutation({
    mutationFn: (recruiterUserId: string) => campaignApi.assignRecruiter(id!, recruiterUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaign', id] })
      setShowAssignModal(false)
      toast.success('Recruiter assigned')
    },
    onError: () => toast.error('Failed to assign recruiter'),
  })

  if (isLoading) return <div className="page-loader"><div className="spinner spinner-lg" /><span>Loading campaign...</span></div>
  if (!camp) return <div className="page-loader"><span>Campaign not found</span></div>

  const rounds = camp.rounds || []
  const recruiters = camp.recruiters || []
  const count = camp._count?.candidates ?? 0

  return (
    <div className="fade-in">
      {/* ── Header ───────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/campaigns')} style={{ marginBottom: '8px' }}>
            <ArrowLeft size={14} /> Campaigns
          </button>
          <h1 style={{ marginBottom: '4px' }}>{camp.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span className={`badge ${STATUS_COLORS[camp.status] || 'badge-muted'}`}>{camp.status}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{camp.role}</span>
            {camp.department && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>· {camp.department}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {camp.status === 'DRAFT' && (
            <button className="btn btn-success btn-sm" onClick={() => statusMutation.mutate('ACTIVE')} disabled={statusMutation.isPending}>
              <Play size={14} /> Activate
            </button>
          )}
          {camp.status === 'ACTIVE' && (
            <button className="btn btn-outline btn-sm" onClick={() => statusMutation.mutate('PAUSED')} disabled={statusMutation.isPending}>
              <Pause size={14} /> Pause
            </button>
          )}
          {camp.status === 'PAUSED' && (
            <>
              <button className="btn btn-success btn-sm" onClick={() => statusMutation.mutate('ACTIVE')} disabled={statusMutation.isPending}>
                <Play size={14} /> Resume
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => statusMutation.mutate('CLOSED')} disabled={statusMutation.isPending}>
                <Lock size={14} /> Close
              </button>
            </>
          )}
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAssignModal(true)}>
            <UserPlus size={14} /> Assign Recruiter
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            <Zap size={14} /> {generateMutation.isPending ? 'Generating...' : 'Regenerate Pool'}
          </button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate(`/admin/campaigns/${id}/questions`)}>
            <Eye size={14} /> Question Pool
          </button>
          {camp.status === 'DRAFT' && (
            <button className="btn btn-outline btn-sm" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
              onClick={() => setShowDeleteModal(true)}>
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      </div>

      {/* ── Tab Bar ──────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '2px' }}>
        {TABS.map(t => (
          <button
            key={t}
            className={`btn btn-ghost btn-sm ${tab === t ? '' : ''}`}
            style={{
              borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
              borderRadius: 0,
              fontWeight: tab === t ? 700 : 400,
              color: tab === t ? 'var(--primary)' : 'var(--text-secondary)',
              paddingBottom: '8px',
            }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab Content ──────────────────────────────── */}
      {tab === 'Overview' && (
        <div className="grid-2" style={{ gap: '20px', alignItems: 'start' }}>
          {/* Quick Stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="grid-2" style={{ gap: '12px' }}>
              {[
                { label: 'Candidates', value: count, icon: '👤', color: 'var(--orange)' },
                { label: 'Rounds', value: rounds.length, icon: '🧩', color: 'var(--teal)' },
                { label: 'Recruiters', value: recruiters.length, icon: '👥', color: 'var(--green-dark)' },
                { label: 'Status', value: camp.status, icon: '📊', color: 'var(--yellow-dark)' },
              ].map(s => (
                <div key={s.label} className="card card-sm" style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{s.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: '1.3rem', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: '18px' }}>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
                Job Description
              </div>
              <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7, maxHeight: '220px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
                {camp.jobDescription}
              </div>
            </div>
          </div>
          {/* Rounds summary */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '0.95rem' }}>Pipeline ({rounds.length} rounds)</h3>
            </div>
            {rounds.map((r: any) => {
              const pool = r.questionPool
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '1.2rem' }}>{ROUND_EMOJI[r.roundType] || '📋'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>Round {r.order} — {r.roundType}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {r.timeLimitMinutes ? `${r.timeLimitMinutes} mins` : ''}
                      {r.passMarkPercent ? ` · Pass: ${r.passMarkPercent}%` : ''}
                    </div>
                  </div>
                  {pool && (
                    <span className={`badge ${pool.status === 'READY' ? 'badge-success' : pool.status === 'GENERATING' || pool.status === 'REGENERATING' ? 'badge-warning' : pool.status === 'FAILED' ? 'badge-danger' : 'badge-muted'}`}>
                      {pool.status}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'Candidates' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '0.95rem' }}>{candidates.length} Candidates</h3>
          </div>
          {candidates.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-icon">👤</div>
              <div className="empty-title">No candidates yet</div>
              <div className="empty-desc">Candidates will appear here once invited</div>
            </div>
          ) : (
            <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Fit %</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c: any) => {
                    const fit = c.scorecard?.technicalFitPercent
                    return (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.user?.firstName} {c.user?.lastName}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{c.user?.email}</td>
                        <td><span className={`badge ${C_STATUS[c.status] || 'badge-muted'}`}>{c.status}</span></td>
                        <td style={{ fontWeight: 700, color: fit >= 70 ? 'var(--green-light)' : fit >= 40 ? 'var(--orange)' : fit ? 'var(--red)' : 'var(--text-muted)' }}>
                          {fit ? `${Math.round(fit)}%` : '—'}
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-icon btn-sm" title="View Scorecard"
                            onClick={() => navigate(`/admin/candidates/${c.id}`)}>
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'Rounds' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontSize: '0.95rem' }}>Pipeline Rounds</h3>
          </div>
          {rounds.map((r: any) => {
            const pool = r.questionPool
            return (
              <div key={r.id} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}>{ROUND_EMOJI[r.roundType] || '📋'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>Round {r.order} — {r.roundType}</div>
                  </div>
                  {pool && <span className={`badge ${pool.status === 'READY' ? 'badge-success' : 'badge-warning'}`}>{pool.status}</span>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {r.timeLimitMinutes && <span>⏱ {r.timeLimitMinutes} mins</span>}
                  {r.passMarkPercent && <span>📊 Pass: {r.passMarkPercent}%</span>}
                  {r.totalQuestions && <span>❓ {r.totalQuestions} questions</span>}
                  {r.failAction && <span>⚡ {r.failAction}</span>}
                  {r.questionMode && <span>📝 {r.questionMode}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'Recruiters' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.95rem' }}>Assigned Recruiters</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAssignModal(true)}>
              <UserPlus size={14} /> Assign
            </button>
          </div>
          {recruiters.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px' }}>
              <div className="empty-icon">👥</div>
              <div className="empty-title">No recruiters assigned</div>
            </div>
          ) : recruiters.map((cr: any) => {
            const u = cr.recruiter?.user
            return (
              <div key={cr.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="sidebar-avatar" style={{ width: '32px', height: '32px', fontSize: '0.72rem' }}>
                  {String(u?.firstName || '?')[0]}{String(u?.lastName || '?')[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u?.firstName} {u?.lastName}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>{u?.email}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Assign Recruiter Modal ─────────────────── */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal modal-sm fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Assign Recruiter</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAssignModal(false)}><X size={18} /></button>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
              {allRecruiters.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No recruiters found. Create one first.</div>
              ) : allRecruiters.map((r: any) => (
                <div key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                  onClick={() => assignMutation.mutate(r.id)}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div className="sidebar-avatar" style={{ width: '30px', height: '30px', fontSize: '0.7rem' }}>
                    {r.firstName?.[0]}{r.lastName?.[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r.firstName} {r.lastName}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{r.email}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Modal ───────────────────────────── */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal modal-sm fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ color: 'var(--red)' }}>Delete Campaign</div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowDeleteModal(false)}><X size={18} /></button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '8px' }}>
              This will permanently delete <strong>{camp.name}</strong> and all related data. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: 'var(--red)' }}
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
