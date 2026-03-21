import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { questionApi } from '../../services/api.services'
import { ArrowLeft, RefreshCw, CheckCircle, X } from 'lucide-react'
import toast from 'react-hot-toast'

type QType = 'MCQ' | 'CODING' | 'INTERVIEW_PROMPT'

interface Question {
  id: string; type: QType; difficulty: 'EASY' | 'MEDIUM' | 'HARD'; topicTag?: string; isActive: boolean
  // MCQ
  stem?: string; options?: { id: string; text: string; isCorrect: boolean }[]
  // Coding
  problemTitle?: string; problemStatement?: string; examples?: { input: string; output: string; explanation?: string }[]
  // Interview
  prompt?: string; evaluationRubric?: string
}

const DIFF_BADGE: Record<string, string> = { EASY: 'badge-success', MEDIUM: 'badge-warning', HARD: 'badge-danger' }
const DIFF_EMOJI: Record<string, string> = { EASY: '🟢', MEDIUM: '🟡', HARD: '🔴' }

function MCQCard({ q, onReject }: { q: Question; onReject: () => void }) {
  return (
    <div className={`question-card ${!q.isActive ? 'rejected' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span className={`badge ${DIFF_BADGE[q.difficulty]}`}>{DIFF_EMOJI[q.difficulty]} {q.difficulty}</span>
          {q.topicTag && <span className="badge badge-teal">#{q.topicTag}</span>}
        </div>
        <button onClick={onReject} className="btn btn-ghost btn-icon btn-sm" title={q.isActive ? 'Reject' : 'Rejected'}>
          <X size={14} style={{ color: q.isActive ? 'var(--red)' : 'var(--text-muted)' }} />
        </button>
      </div>
      <p className="question-text">{q.stem}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {(q.options || []).map(opt => (
          <div key={opt.id} className={`mcq-option ${opt.isCorrect ? 'correct' : ''}`}>
            <span className="mcq-option-letter">{opt.id})</span>
            <span>{opt.text}</span>
            {opt.isCorrect && <CheckCircle size={14} style={{ marginLeft: 'auto', flexShrink: 0 }} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function CodingCard({ q, onReject }: { q: Question; onReject: () => void }) {
  return (
    <div className={`question-card ${!q.isActive ? 'rejected' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span className={`badge ${DIFF_BADGE[q.difficulty]}`}>{DIFF_EMOJI[q.difficulty]} {q.difficulty}</span>
          {q.topicTag && <span className="badge badge-teal">#{q.topicTag}</span>}
        </div>
        <button onClick={onReject} className="btn btn-ghost btn-icon btn-sm">
          <X size={14} style={{ color: q.isActive ? 'var(--red)' : 'var(--text-muted)' }} />
        </button>
      </div>
      <h4 style={{ marginTop: '10px', color: 'var(--orange)', fontSize: '0.95rem' }}>{q.problemTitle}</h4>
      <p className="question-text">{q.problemStatement}</p>
      {(q.examples || []).slice(0, 2).map((ex, i) => (
        <div key={i} style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 12px', marginTop: '6px',
          fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem',
        }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Example {i + 1}</div>
          <div><span style={{ color: 'var(--teal)' }}>Input:</span> {ex.input}</div>
          <div><span style={{ color: 'var(--green-dark)' }}>Output:</span> {ex.output}</div>
        </div>
      ))}
    </div>
  )
}

function InterviewCard({ q, onReject }: { q: Question; onReject: () => void }) {
  return (
    <div className={`question-card ${!q.isActive ? 'rejected' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span className={`badge ${DIFF_BADGE[q.difficulty]}`}>{DIFF_EMOJI[q.difficulty]} {q.difficulty}</span>
          {q.topicTag && <span className="badge badge-teal">#{q.topicTag}</span>}
        </div>
        <button onClick={onReject} className="btn btn-ghost btn-icon btn-sm">
          <X size={14} style={{ color: q.isActive ? 'var(--red)' : 'var(--text-muted)' }} />
        </button>
      </div>
      <p className="question-text" style={{ fontStyle: 'italic' }}>"{q.prompt}"</p>
      {q.evaluationRubric && (
        <div style={{
          background: 'var(--teal-soft)', border: '1px solid rgba(35,151,156,0.25)',
          borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginTop: '8px',
          fontSize: '0.8rem', color: 'var(--teal-light)',
        }}>
          <strong>Rubric:</strong> {q.evaluationRubric}
        </div>
      )}
    </div>
  )
}

export default function QuestionPoolPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<QType>('MCQ')

  const { data: pool, isLoading } = useQuery({
    queryKey: ['question-pool', id],
    queryFn: () => questionApi.getPoolPreview(id!),
    enabled: !!id,
    refetchInterval: (q) => {
      const list = Array.isArray(q.state.data) ? q.state.data : []
      const isGenerating = list.some(p => p.status === 'GENERATING' || p.status === 'REGENERATING')
      return isGenerating ? 5000 : false
    },
  })

  const approveMutation = useMutation({
    mutationFn: ({ questionId, approved }: { questionId: string; approved: boolean }) =>
      questionApi.approveQuestion(questionId, approved),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['question-pool', id] }),
    onError: () => toast.error('Failed to update question'),
  })

  const generateMutation = useMutation({
    mutationFn: () => questionApi.generatePool(id!),
    onSuccess: () => {
      toast.success('Regeneration started!')
      qc.invalidateQueries({ queryKey: ['question-pool', id] })
    },
  })

  const pools = Array.isArray(pool) ? pool : []
  const questions: Question[] = pools.flatMap((p: any) => p.questions || [])
  
  const byType = {
    MCQ:              questions.filter(q => q.type === 'MCQ'),
    CODING:           questions.filter(q => q.type === 'CODING'),
    INTERVIEW_PROMPT: questions.filter(q => q.type === 'INTERVIEW_PROMPT'),
  }

  const tabs: { key: QType; label: string; count: number }[] = [
    { key: 'MCQ', label: '📝 MCQ', count: byType.MCQ.length },
    { key: 'CODING', label: '💻 Coding', count: byType.CODING.length },
    { key: 'INTERVIEW_PROMPT', label: '🎙️ Interview', count: byType.INTERVIEW_PROMPT.length },
  ]

  const isGenerating = pools.some((p: any) => p.status === 'GENERATING' || p.status === 'REGENERATING')
  const hasFailed = pools.some((p: any) => p.status === 'FAILED')
  const rejectedCount = questions.filter(q => !q.isActive).length

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/campaigns/${id}`)} style={{ marginBottom: '8px' }}>
            <ArrowLeft size={14} /> Campaign
          </button>
          <h1 style={{ marginBottom: '4px' }}>Question Pool</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            {questions.length} total questions
            {rejectedCount > 0 && <span style={{ color: 'var(--red)', marginLeft: '6px' }}>· {rejectedCount} rejected</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || isGenerating}>
            <RefreshCw size={14} /> Regenerate
          </button>
          <button className="btn btn-success btn-sm">
            <CheckCircle size={14} /> Approve All
          </button>
        </div>
      </div>

      {/* Status banner while generating */}
      {isGenerating && (
        <div style={{
          background: 'var(--yellow-soft)', border: '1px solid rgba(237,252,129,0.3)',
          borderRadius: 'var(--radius-md)', padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px',
          color: '#a88f00',
        }}>
          <div className="spinner spinner-sm" style={{ borderTopColor: '#a88f00' }} />
          <span>AI is generating questions based on the Job Description. This may take 30–60 seconds...</span>
        </div>
      )}

      {/* Status banner when failed */}
      {hasFailed && !isGenerating && (
        <div style={{
          background: 'var(--red-soft)', border: '1px solid rgba(251,55,30,0.3)',
          borderRadius: 'var(--radius-md)', padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px',
          color: 'var(--red)',
        }}>
          <span>❌ Generation failed for one or more rounds. Please edit the pipeline or try regenerating.</span>
        </div>
      )}

      {isLoading ? (
        <div className="page-loader"><div className="spinner spinner-lg" /><span>Loading question pool...</span></div>
      ) : questions.length === 0 && !isGenerating ? (
        <div className="empty-state">
          <div className="empty-icon">🤖</div>
          <div className="empty-title">No questions yet</div>
          <div className="empty-desc">Trigger AI generation to create the question pool</div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: '14px' }}
            onClick={() => generateMutation.mutate()}>
            <RefreshCw size={14} /> Generate Now
          </button>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="tabs" style={{ marginBottom: '20px' }}>
            {tabs.map(t => (
              <button
                key={t.key}
                className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
                <span style={{
                  background: activeTab === t.key ? 'var(--orange-soft)' : 'var(--bg-elevated)',
                  color: activeTab === t.key ? 'var(--orange)' : 'var(--text-muted)',
                  borderRadius: '12px', padding: '1px 7px', fontSize: '0.72rem',
                  fontWeight: 700, marginLeft: '4px',
                }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Questions */}
          <div>
            {byType[activeTab].length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <div className="empty-title">No {activeTab} questions</div>
                <div className="empty-desc">This round type has no questions generated yet</div>
              </div>
            ) : (
              byType[activeTab].map(q => {
                const handleReject = () => approveMutation.mutate({ questionId: q.id, approved: !q.isActive })
                if (q.type === 'MCQ')              return <MCQCard key={q.id} q={q} onReject={handleReject} />
                if (q.type === 'CODING')           return <CodingCard key={q.id} q={q} onReject={handleReject} />
                if (q.type === 'INTERVIEW_PROMPT') return <InterviewCard key={q.id} q={q} onReject={handleReject} />
                return null
              })
            )}
          </div>

          {/* Stats footer */}
          <div className="card card-sm" style={{ marginTop: '20px', background: 'var(--bg-elevated)', display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
            {[
              { label: 'Total', value: questions.length, color: 'var(--cream)' },
              { label: 'Active', value: questions.filter(q => q.isActive).length, color: 'var(--green-dark)' },
              { label: 'Rejected', value: rejectedCount, color: 'var(--red)' },
              { label: 'Easy', value: questions.filter(q => q.difficulty === 'EASY').length, color: 'var(--green-dark)' },
              { label: 'Medium', value: questions.filter(q => q.difficulty === 'MEDIUM').length, color: '#a88f00' },
              { label: 'Hard', value: questions.filter(q => q.difficulty === 'HARD').length, color: 'var(--red)' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '1.2rem', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
