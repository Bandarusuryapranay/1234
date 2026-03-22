import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { questionApi } from '../../services/api.services'
import {
  ArrowLeft, RefreshCw, CheckCircle, X, Check,
  AlertTriangle, ThumbsUp, ThumbsDown,
} from 'lucide-react'
import toast from 'react-hot-toast'

type QType = 'MCQ' | 'CODING' | 'INTERVIEW_PROMPT'

interface Question {
  id: string; type: QType; difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  topicTag?: string; isActive: boolean
  stem?: string; options?: { id: string; text: string; isCorrect: boolean }[]
  problemTitle?: string; problemStatement?: string
  examples?: { input: string; output: string; explanation?: string }[]
  prompt?: string; evaluationRubric?: string
}

interface ApprovalStatus {
  poolId: string; roundOrder: number; roundType: string
  totalQuestions: number; approvedCount: number
  pendingCount: number; minimumRequired: number
  isReady: boolean; poolStatus: string
}

const DIFF_BADGE: Record<string, string> = {
  EASY: 'badge-success', MEDIUM: 'badge-warning', HARD: 'badge-danger',
}

// ── Question Cards ────────────────────────────────────────────
function QuestionCard({
  q, onToggle, isUpdating,
}: {
  q: Question
  onToggle: () => void
  isUpdating: boolean
}) {
  const approved = q.isActive

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: `1px solid ${approved ? 'rgba(134,254,144,0.25)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '16px 18px',
      marginBottom: 10,
      opacity: isUpdating ? 0.6 : 1,
      transition: 'all 0.2s',
      position: 'relative',
    }}>

      {/* Status strip on left */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        borderRadius: '12px 0 0 12px',
        background: approved ? 'var(--green-dark)' : 'var(--border)',
        transition: 'background 0.2s',
      }} />

      <div style={{ paddingLeft: 8 }}>
        {/* Header row */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 10, gap: 8, flexWrap:'wrap' }}>
          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
            <span className={`badge ${DIFF_BADGE[q.difficulty]}`} style={{ fontSize:'0.62rem' }}>
              {q.difficulty}
            </span>
            {q.topicTag && (
              <span className="badge badge-teal" style={{ fontSize:'0.6rem' }}>
                #{q.topicTag}
              </span>
            )}
            {approved && (
              <span className="badge badge-success" style={{ fontSize:'0.6rem' }}>
                ✓ APPROVED
              </span>
            )}
          </div>

          {/* Approve / Reject toggle button */}
          <button
            onClick={onToggle}
            disabled={isUpdating}
            className={`btn btn-sm ${approved ? 'btn-danger' : 'btn-success'}`}
            style={{ gap: 5, fontSize:'0.78rem', padding:'5px 12px' }}
          >
            {isUpdating
              ? <div className="spinner spinner-sm" />
              : approved
                ? <><X size={13} /> Reject</>
                : <><Check size={13} /> Approve</>
            }
          </button>
        </div>

        {/* MCQ content */}
        {q.type === 'MCQ' && (
          <>
            <p style={{ color:'var(--text-primary)', fontSize:'0.9rem', lineHeight:1.55, marginBottom:10 }}>
              {q.stem}
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              {(q.options || []).map(opt => (
                <div key={opt.id} style={{
                  padding:'7px 11px', borderRadius:'var(--radius-sm)', fontSize:'0.82rem',
                  display:'flex', alignItems:'center', gap:8,
                  background: opt.isCorrect ? 'var(--green-soft)' : 'var(--bg-card)',
                  border: `1px solid ${opt.isCorrect ? 'rgba(134,254,144,0.3)' : 'transparent'}`,
                  color: opt.isCorrect ? 'var(--green-dark)' : 'var(--text-secondary)',
                }}>
                  <span style={{ fontWeight:700, fontSize:'0.72rem', flexShrink:0 }}>{opt.id})</span>
                  <span>{opt.text}</span>
                  {opt.isCorrect && <CheckCircle size={13} style={{ marginLeft:'auto', flexShrink:0 }} />}
                </div>
              ))}
            </div>
          </>
        )}

        {/* CODING content */}
        {q.type === 'CODING' && (
          <>
            <h4 style={{ color:'var(--orange)', fontSize:'0.9rem', marginBottom:6 }}>
              {q.problemTitle}
            </h4>
            <p style={{ color:'var(--text-primary)', fontSize:'0.88rem', lineHeight:1.55, marginBottom:8 }}>
              {q.problemStatement}
            </p>
            {(q.examples || []).slice(0, 2).map((ex, i) => (
              <div key={i} style={{
                background:'var(--bg-card)', border:'1px solid var(--border)',
                borderRadius:'var(--radius-sm)', padding:'9px 12px', marginTop:6,
                fontFamily:'JetBrains Mono, monospace', fontSize:'0.78rem',
              }}>
                <div style={{ color:'var(--text-muted)', marginBottom:3 }}>Example {i + 1}</div>
                <div><span style={{ color:'var(--teal)' }}>Input:</span> {ex.input}</div>
                <div><span style={{ color:'var(--green-dark)' }}>Output:</span> {ex.output}</div>
              </div>
            ))}
          </>
        )}

        {/* INTERVIEW content */}
        {q.type === 'INTERVIEW_PROMPT' && (
          <>
            <p style={{ color:'var(--text-primary)', fontSize:'0.9rem', lineHeight:1.6, fontStyle:'italic', marginBottom:8 }}>
              "{q.prompt}"
            </p>
            {q.evaluationRubric && (
              <div style={{
                background:'var(--teal-soft)', border:'1px solid rgba(35,151,156,0.2)',
                borderRadius:'var(--radius-sm)', padding:'9px 12px', marginTop:6,
                fontSize:'0.78rem', color:'var(--teal-light)',
              }}>
                <strong>Rubric:</strong> {q.evaluationRubric}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function QuestionPoolPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<QType>('MCQ')
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())

  // Pool data
  const { data: pool, isLoading } = useQuery({
    queryKey: ['question-pool', id],
    queryFn:  () => questionApi.getPoolPreview(id!),
    enabled:  !!id,
    refetchInterval: (q) => {
      const list = Array.isArray(q.state.data) ? q.state.data : []
      return list.some((p: any) => p.status === 'GENERATING' || p.status === 'REGENERATING') ? 4000 : false
    },
  })

  // Approval status per round
  const { data: approvalStatus } = useQuery({
    queryKey: ['approval-status', id],
    queryFn:  () => questionApi.getApprovalStatus(id!),
    enabled:  !!id,
    refetchInterval: 8000,
  })

  const statusByPool: Record<string, ApprovalStatus> = {}
  if (Array.isArray(approvalStatus)) {
    approvalStatus.forEach((s: ApprovalStatus) => { statusByPool[s.poolId] = s })
  }

  // Mutations
  const approveMutation = useMutation({
    mutationFn: ({ questionId, approved }: { questionId: string; approved: boolean }) =>
      questionApi.approveQuestion(questionId, approved),
    onMutate: ({ questionId }) => {
      setUpdatingIds(prev => new Set([...prev, questionId]))
    },
    onSettled: (_, __, { questionId }) => {
      setUpdatingIds(prev => { const n = new Set(prev); n.delete(questionId); return n })
      qc.invalidateQueries({ queryKey: ['question-pool', id] })
      qc.invalidateQueries({ queryKey: ['approval-status', id] })
    },
    onError: () => toast.error('Failed to update question'),
  })

  const bulkMutation = useMutation({
    mutationFn: ({ poolId, approve }: { poolId: string; approve: boolean }) =>
      questionApi.bulkApprove(poolId, approve),
    onSuccess: (_, { approve }) => {
      toast.success(approve ? 'All questions approved!' : 'All questions rejected!')
      qc.invalidateQueries({ queryKey: ['question-pool', id] })
      qc.invalidateQueries({ queryKey: ['approval-status', id] })
    },
    onError: () => toast.error('Bulk action failed'),
  })

  const generateMutation = useMutation({
    mutationFn: () => questionApi.generatePool(id!),
    onSuccess: () => {
      toast.success('Regeneration started! Questions will be ready in ~60 seconds.')
      qc.invalidateQueries({ queryKey: ['question-pool', id] })
      qc.invalidateQueries({ queryKey: ['approval-status', id] })
    },
    onError: () => toast.error('Failed to trigger regeneration'),
  })

  const pools        = Array.isArray(pool) ? pool : []
  const allQuestions: Question[] = pools.flatMap((p: any) => p.questions || [])
  const isGenerating = pools.some((p: any) => p.status === 'GENERATING' || p.status === 'REGENERATING')
  const hasFailed    = pools.some((p: any) => p.status === 'FAILED')

  const byType = {
    MCQ:              allQuestions.filter(q => q.type === 'MCQ'),
    CODING:           allQuestions.filter(q => q.type === 'CODING'),
    INTERVIEW_PROMPT: allQuestions.filter(q => q.type === 'INTERVIEW_PROMPT'),
  }

  const approvedTotal = allQuestions.filter(q => q.isActive).length
  const pendingTotal  = allQuestions.filter(q => !q.isActive).length
  const allReady      = Array.isArray(approvalStatus) && approvalStatus.length > 0
    && approvalStatus.every((s: ApprovalStatus) => s.isReady)

  const tabs = [
    { key: 'MCQ'              as QType, label:'📝 MCQ',       count: byType.MCQ.length },
    { key: 'CODING'           as QType, label:'💻 Coding',    count: byType.CODING.length },
    { key: 'INTERVIEW_PROMPT' as QType, label:'🎙️ Interview', count: byType.INTERVIEW_PROMPT.length },
  ]

  return (
    <div className="fade-in">

      {/* Page header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:12 }}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/campaigns/${id}`)} style={{ marginBottom:8 }}>
            <ArrowLeft size={14} /> Back to Campaign
          </button>
          <h1 style={{ marginBottom:4 }}>Question Pool</h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'0.85rem' }}>
            {allQuestions.length} total · {' '}
            <span style={{ color:'var(--green-dark)', fontWeight:600 }}>{approvedTotal} approved</span>
            {' · '}
            <span style={{ color:'var(--text-muted)' }}>{pendingTotal} pending</span>
          </p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button className="btn btn-outline btn-sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || isGenerating}>
            <RefreshCw size={14} /> Regenerate
          </button>
        </div>
      </div>

      {/* Generating banner */}
      {isGenerating && (
        <div style={{
          background:'var(--yellow-soft)', border:'1px solid rgba(237,252,129,0.3)',
          borderRadius:'var(--radius-md)', padding:'14px 18px',
          display:'flex', alignItems:'center', gap:12, marginBottom:18, color:'#a88f00',
        }}>
          <div className="spinner spinner-sm" style={{ borderTopColor:'#a88f00' }} />
          <span>AI is generating questions from the Job Description. This takes 30–60 seconds...</span>
        </div>
      )}

      {/* Failed banner */}
      {hasFailed && !isGenerating && (
        <div style={{
          background:'var(--red-soft)', border:'1px solid rgba(251,55,30,0.3)',
          borderRadius:'var(--radius-md)', padding:'14px 18px',
          display:'flex', alignItems:'center', gap:12, marginBottom:18, color:'var(--red)',
        }}>
          <AlertTriangle size={18} />
          <span>Generation failed for one or more rounds. Please try regenerating.</span>
        </div>
      )}

      {/* Per-round approval threshold cards */}
      {Array.isArray(approvalStatus) && approvalStatus.length > 0 && !isGenerating && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:20 }}>
          {approvalStatus.map((s: ApprovalStatus) => (
            <div key={s.poolId} style={{
              flex:'1 1 200px', padding:'14px 16px', borderRadius:'var(--radius-md)',
              border: `1px solid ${s.isReady ? 'rgba(134,254,144,0.3)' : 'rgba(251,133,30,0.3)'}`,
              background: s.isReady ? 'var(--green-soft)' : 'var(--orange-soft)',
            }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontWeight:700, fontSize:'0.85rem', color:'var(--text-primary)' }}>
                  Round {s.roundOrder} — {s.roundType}
                </span>
                {s.isReady
                  ? <CheckCircle size={16} color="var(--green-dark)" />
                  : <AlertTriangle size={16} color="var(--orange)" />
                }
              </div>
              <div style={{ fontSize:'0.8rem', color:'var(--text-secondary)', marginBottom:10 }}>
                <span style={{ color:'var(--green-dark)', fontWeight:700 }}>{s.approvedCount}</span>
                {' / '}
                <span style={{ fontWeight:600 }}>{s.minimumRequired} required</span>
                {' approved'}
              </div>
              {/* Progress bar */}
              <div style={{ height:5, borderRadius:3, background:'var(--border)', overflow:'hidden' }}>
                <div style={{
                  height:'100%', borderRadius:3, transition:'width 0.4s ease',
                  background: s.isReady ? 'var(--green-dark)' : 'var(--orange)',
                  width: `${Math.min(100, (s.approvedCount / s.minimumRequired) * 100)}%`,
                }} />
              </div>
              {/* Bulk action buttons */}
              <div style={{ display:'flex', gap:6, marginTop:12 }}>
                <button
                  className="btn btn-success btn-sm"
                  style={{ flex:1, fontSize:'0.75rem', padding:'5px 8px', gap:4 }}
                  onClick={() => bulkMutation.mutate({ poolId: s.poolId, approve: true })}
                  disabled={bulkMutation.isPending}
                >
                  <ThumbsUp size={12} /> Approve All
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  style={{ flex:1, fontSize:'0.75rem', padding:'5px 8px', gap:4, color:'var(--text-muted)' }}
                  onClick={() => bulkMutation.mutate({ poolId: s.poolId, approve: false })}
                  disabled={bulkMutation.isPending}
                >
                  <ThumbsDown size={12} /> Reject All
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All approved banner */}
      {allReady && !isGenerating && allQuestions.length > 0 && (
        <div style={{
          background:'var(--green-soft)', border:'1px solid rgba(134,254,144,0.3)',
          borderRadius:'var(--radius-md)', padding:'14px 18px',
          display:'flex', alignItems:'center', gap:12, marginBottom:18, color:'var(--green-dark)',
        }}>
          <CheckCircle size={18} />
          <span style={{ fontWeight:600 }}>
            All rounds have enough approved questions. You can now activate the campaign.
          </span>
        </div>
      )}

      {/* Loading / empty */}
      {isLoading ? (
        <div className="page-loader"><div className="spinner spinner-lg" /><span>Loading pool...</span></div>
      ) : allQuestions.length === 0 && !isGenerating ? (
        <div className="empty-state">
          <div className="empty-icon">🤖</div>
          <div className="empty-title">No questions yet</div>
          <div className="empty-desc">Generate the AI question pool to start reviewing</div>
          <button className="btn btn-primary btn-sm" style={{ marginTop:14 }}
            onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            <RefreshCw size={14} /> Generate Now
          </button>
        </div>
      ) : (
        <>
          {/* Type tabs */}
          <div className="tabs" style={{ marginBottom:18 }}>
            {tabs.map(t => {
              const approvedInTab = byType[t.key].filter(q => q.isActive).length
              return (
                <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(t.key)}>
                  {t.label}
                  <span style={{
                    background: activeTab === t.key ? 'var(--orange-soft)' : 'var(--bg-elevated)',
                    color: activeTab === t.key ? 'var(--orange)' : 'var(--text-muted)',
                    borderRadius:12, padding:'1px 7px', fontSize:'0.7rem', fontWeight:700, marginLeft:4,
                  }}>
                    {approvedInTab}/{t.count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Questions list */}
          {byType[activeTab].length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <div className="empty-title">No {activeTab} questions in pool</div>
            </div>
          ) : (
            byType[activeTab].map(q => (
              <QuestionCard
                key={q.id}
                q={q}
                isUpdating={updatingIds.has(q.id)}
                onToggle={() => approveMutation.mutate({ questionId: q.id, approved: !q.isActive })}
              />
            ))
          )}

          {/* Stats footer */}
          <div className="card card-sm" style={{ marginTop:20, background:'var(--bg-elevated)', display:'flex', flexWrap:'wrap', gap:20, justifyContent:'center' }}>
            {[
              { label:'Total',    value: allQuestions.length,                                    color:'var(--cream)' },
              { label:'Approved', value: approvedTotal,                                           color:'var(--green-dark)' },
              { label:'Pending',  value: pendingTotal,                                            color:'var(--orange)' },
              { label:'Easy',     value: allQuestions.filter(q => q.difficulty === 'EASY').length,   color:'var(--green-dark)' },
              { label:'Medium',   value: allQuestions.filter(q => q.difficulty === 'MEDIUM').length, color:'#a88f00' },
              { label:'Hard',     value: allQuestions.filter(q => q.difficulty === 'HARD').length,   color:'var(--red)' },
            ].map(s => (
              <div key={s.label} style={{ textAlign:'center' }}>
                <div style={{ fontWeight:800, fontSize:'1.2rem', color:s.color }}>{s.value}</div>
                <div style={{ fontSize:'0.72rem', color:'var(--text-secondary)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}