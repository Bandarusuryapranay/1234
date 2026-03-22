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
    setSessionId, setFaceDescriptor,
  } = useOutletContext<any>()

  const [loading, setLoading]       = useState(true)
  const [attempt, setAttempt]       = useState<any>(null)
  const [answers, setAnswers]       = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { startAttempt() }, [roundId])

  const startAttempt = async () => {
    try {
      setLoading(true)
      const data = await attemptApi.start(roundId!)
      setAttempt(data.attempt)
      if (setAttemptId)      setAttemptId(data.attempt.id)
      if (setSessionId)      setSessionId(data.sessionId)
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
    attemptApi.submitMCQ({
      attemptId:        attempt.id,
      questionId:       qId,
      selectedOptionId: optionId,
      timeTakenSeconds: 0,
    }).catch(console.error)
  }

  // ── FIXED: always return to lobby so candidate goes through
  //    rules + face-verify before starting the next round ────────
  const handleFinish = async () => {
    if (!window.confirm('Are you sure you want to submit your assessment?')) return

    setSubmitting(true)
    try {
      const res = await attemptApi.complete(attempt.id)
      const outcome = res.advancement?.outcome

      if (outcome === 'ADVANCED') {
        // Passed — more rounds ahead
        // Go to lobby so candidate sees Round N+1 unlocked,
        // reads the rules, and does face verification before entering.
        toast.success('Round passed! Check the lobby for your next round.')
        navigate('/candidate/lobby', {
          state: { advancement: res.advancement },
        })

      } else if (outcome === 'ALL_ROUNDS_COMPLETE') {
        // Passed the final round
        toast.success('All rounds complete. Well done!')
        navigate('/candidate/complete')

      } else if (outcome === 'REJECTED') {
        // Failed with AUTO_REJECT
        navigate('/candidate/terminated', {
          state: { reason: res.advancement?.reason, type: 'failed' },
        })

      } else if (outcome === 'FLAGGED') {
        // Failed with MANUAL_REVIEW — pending recruiter decision
        navigate('/candidate/complete', {
          state: { pendingReview: true },
        })

      } else {
        // Fallback — should not normally reach here
        toast.success('Assessment submitted.')
        navigate('/candidate/lobby')
      }

    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'50vh', gap:12 }}>
        <div className="spinner" />
        <span style={{ color:'var(--text-secondary)', fontSize:'0.875rem' }}>Loading questions...</span>
      </div>
    )
  }

  const q = questions[currentIndex]
  if (!q) return <div style={{ padding:40, color:'var(--text-secondary)' }}>No questions assigned.</div>

  return (
    <div style={{ padding:'24px', maxWidth:'900px', margin:'0 auto', width:'100%' }}>

      {/* Question header */}
      <div style={{ marginBottom:32 }}>
        <div style={{
          display:'flex', alignItems:'center', gap:8,
          color:'var(--text-muted)', fontSize:'0.88rem', marginBottom:8,
        }}>
          <span>QUESTION {currentIndex + 1} OF {questions.length}</span>
          <span style={{ width:4, height:4, borderRadius:'50%', background:'var(--border)' }} />
          <span style={{ color:'var(--orange)', fontWeight:600 }}>{q.difficulty}</span>
        </div>
        <h2 style={{ fontSize:'1.4rem', color:'var(--cream)', lineHeight:1.4 }}>
          {q.stem}
        </h2>
      </div>

      {/* Options */}
      <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:40 }}>
        {((q.options || []) as any[]).map((opt: any) => {
          const selected = answers[q.id] === opt.id
          return (
            <label
              key={opt.id}
              style={{
                padding:'18px 22px', borderRadius:12, cursor:'pointer',
                display:'flex', alignItems:'center', gap:16,
                transition:'all 0.2s ease',
                border: `1px solid ${selected ? 'var(--orange)' : 'var(--border)'}`,
                background: selected ? 'rgba(251,133,30,0.10)' : 'var(--bg-elevated)',
              }}
            >
              <input
                type="radio"
                name={`q-${q.id}`}
                checked={selected}
                onChange={() => handleSelect(opt.id)}
                style={{ accentColor:'var(--orange)', width:18, height:18 }}
              />
              <span style={{
                fontSize:'1rem',
                color: selected ? 'var(--cream)' : 'var(--text-secondary)',
              }}>
                {opt.text}
              </span>
            </label>
          )
        })}
      </div>

      {/* Navigation */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        borderTop:'1px solid var(--border)', paddingTop:22,
      }}>
        <button
          className="btn btn-secondary"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex(currentIndex - 1)}
        >
          <ChevronLeft size={18} /> Previous
        </button>

        <div style={{ display:'flex', gap:10 }}>
          {currentIndex === questions.length - 1 ? (
            <button
              className="btn btn-primary"
              onClick={handleFinish}
              disabled={submitting}
            >
              {submitting
                ? <><div className="spinner spinner-sm" /> Submitting...</>
                : <><Send size={16} /> Finish Assessment</>}
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={() => setCurrentIndex(currentIndex + 1)}
            >
              Next Question <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}