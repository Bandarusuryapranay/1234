import { useState, useEffect } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { attemptApi } from '../../services/api.services'
import { ChevronRight, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

export default function InterviewRound() {
  const { roundId } = useParams()
  const navigate = useNavigate()
  const { setAttemptId, setStrikes, setTimer, setRoundTitle, setSessionId, setFaceDescriptor } = useOutletContext<any>()
  
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState<'TEXT' | 'AUDIO'>('TEXT')

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
      setRoundTitle('AI Interview')
      setTimer(data.attempt.timeLimitMinutes * 60)
      setStrikes(data.attempt.strikeCount)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start attempt')
      navigate('/candidate/lobby')
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAnswers({ ...answers, [questions[currentIndex].id]: e.target.value })
  }

  const handleNext = async () => {
    const qId = questions[currentIndex].id
    if (!answers[qId]) {
      toast.error('Please provide an answer before moving to the next question.')
      return
    }

    setSubmitting(true)
    try {
      await attemptApi.submitInterview({
        attemptId: attempt.id,
        questionId: qId,
        mode: mode,
        textAnswer: answers[qId],
        timeTakenSeconds: 0
      })
      
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        await handleFinish()
      }
    } catch (err) {
      toast.error('Failed to submit answer')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFinish = async () => {
    try {
      const res = await attemptApi.complete(attempt.id)
      if (res.advancement?.outcome === 'ADVANCED') {
        toast.success('Interview completed! Advancing to next round...')
        navigate(`/candidate/assessment/${res.advancement.nextRound.id}`)
      } else {
        toast.success('Interview completed!')
        navigate('/candidate/lobby')
      }
    } catch (err) {
      toast.error('Failed to finish interview')
    }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><div className="spinner" /></div>

  const q = questions[currentIndex]
  if (!q) return <div>No questions.</div>

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* AI Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--orange), var(--red))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(251, 133, 30, 0.3)' }}>
          <MessageSquare size={32} color="white" />
        </div>
        <div>
          <h2 style={{ color: 'var(--cream)', fontSize: '1.5rem', marginBottom: '4px' }}>AI Interview Round</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Question {currentIndex + 1} of {questions.length}</p>
        </div>
      </div>

      {/* Question Prompt */}
      <div className="card fade-in" style={{ background: 'var(--bg-elevated)', padding: '32px', marginBottom: '32px', position: 'relative' }}>
         <div style={{ position: 'absolute', top: '-10px', left: '20px', background: 'var(--orange)', color: 'white', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>AI PROMPT</div>
         <p style={{ color: 'var(--cream)', fontSize: '1.25rem', lineHeight: 1.5, fontWeight: 500 }}>
           {q.prompt}
         </p>
      </div>

      {/* Answer Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
         <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
            <button 
              className={`btn btn-sm ${mode === 'TEXT' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMode('TEXT')}
            >
              Text Mode
            </button>
            <button 
              className={`btn btn-sm ${mode === 'AUDIO' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMode('AUDIO')}
              disabled
            >
              Audio Mode (Coming soon)
            </button>
         </div>

         <textarea 
            value={answers[q.id] || ''}
            onChange={handleAnswerChange}
            placeholder="Type your answer here..."
            style={{
              flex: 1,
              width: '100%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '24px',
              color: 'var(--cream)',
              fontSize: '1.1rem',
              lineHeight: 1.6,
              resize: 'none',
              outline: 'none',
              minHeight: '200px',
              transition: 'border-color 0.2s ease'
            }}
         />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', alignItems: 'center' }}>
         <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
           Tips: Provide detailed answers based on your experience.
         </div>
         <button className="btn btn-primary btn-lg" onClick={handleNext} disabled={submitting}>
            {submitting ? 'Processing...' : currentIndex === questions.length - 1 ? 'Finish Interview' : 'Next Question'} 
            <ChevronRight size={18} />
         </button>
      </div>
    </div>
  )
}
