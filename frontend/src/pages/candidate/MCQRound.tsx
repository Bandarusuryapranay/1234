import { useState, useEffect } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { attemptApi } from '../../services/api.services'
import { ChevronLeft, ChevronRight, Send } from 'lucide-react'
import toast from 'react-hot-toast'

export default function MCQRound() {
  const { roundId } = useParams()
  const navigate = useNavigate()
  const { 
    setAttemptId, setStrikes, setTimer, setRoundTitle,
    questions, setQuestions, currentIndex, setCurrentIndex,
    setSessionId, setFaceDescriptor
  } = useOutletContext<any>()
  
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState<any>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    startAttempt()
  }, [roundId])

  const startAttempt = async () => {
    try {
      setLoading(true)
      const data = await attemptApi.start(roundId!)
      setAttempt(data.attempt)
      if (setAttemptId) setAttemptId(data.attempt.id)
      if (setSessionId) setSessionId(data.sessionId)
      if (setFaceDescriptor) setFaceDescriptor(data.faceDescriptor)
      setQuestions(data.questions)
      setRoundTitle(data.attempt.roundType || 'MCQ Assessment')
      setTimer(data.attempt.timeLimitMinutes * 60)
      setStrikes(data.attempt.strikeCount)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start attempt')
      navigate('/candidate/lobby')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (optionId: string) => {
    const qId = questions[currentIndex].id
    setAnswers({ ...answers, [qId]: optionId })
    
    // Auto-save to backend
    attemptApi.submitMCQ({
      attemptId: attempt.id,
      questionId: qId,
      selectedOptionId: optionId,
      timeTakenSeconds: 0 // Placeholder
    }).catch(console.error)
  }

  const handleFinish = async () => {
    if (!window.confirm('Are you sure you want to submit your assessment?')) return
    
    setSubmitting(true)
    try {
      const res = await attemptApi.complete(attempt.id)
      if (res.advancement?.outcome === 'ADVANCED') {
        toast.success(`Advancing to next round!`)
        navigate(`/candidate/assessment/${res.advancement.nextRound.id}`)
      } else {
        toast.success('Assessment submitted successfully!')
        navigate('/candidate/lobby')
      }
    } catch (err: any) {
      toast.error('Failed to complete assessment')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="spinner" />

  const q = questions[currentIndex]
  if (!q) return <div>No questions assigned.</div>

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      {/* Question Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '8px' }}>
          <span>QUESTION {currentIndex + 1} OF {questions.length}</span>
          <span style={{ height: '4px', width: '4px', borderRadius: '50%', background: 'var(--border)' }} />
          <span style={{ color: 'var(--orange)', fontWeight: 600 }}>{q.difficulty}</span>
        </div>
        <h2 style={{ fontSize: '1.4rem', color: 'var(--cream)', lineHeight: 1.4 }}>
          {q.stem}
        </h2>
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
        {((q.options || []) as any[]).map((opt: any) => (
          <label 
            key={opt.id}
            style={{
              padding: '20px 24px',
              borderRadius: '12px',
              border: `1px solid ${answers[q.id] === opt.id ? 'var(--orange)' : 'var(--border)'}`,
              background: answers[q.id] === opt.id ? 'rgba(251, 133, 30, 0.1)' : 'var(--bg-elevated)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              transition: 'all 0.2s ease',
            }}
          >
            <input 
              type="radio" 
              name={`q-${q.id}`} 
              checked={answers[q.id] === opt.id}
              onChange={() => handleSelect(opt.id)}
              style={{ accentColor: 'var(--orange)', width: '18px', height: '18px' }}
            />
            <span style={{ fontSize: '1.05rem', color: answers[q.id] === opt.id ? 'var(--cream)' : 'var(--text-secondary)' }}>
              {opt.text}
            </span>
          </label>
        ))}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
        <button 
          className="btn btn-secondary"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(currentIndex - 1)}
        >
          <ChevronLeft size={18} /> Previous
        </button>

        <div style={{ display: 'flex', gap: '12px' }}>
          {currentIndex === questions.length - 1 ? (
            <button className="btn btn-primary" onClick={handleFinish} disabled={submitting}>
              {submitting ? 'Submitting...' : <><Send size={18} /> Finish Assessment</>}
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setCurrentIndex(currentIndex + 1)}>
              Next Question <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
