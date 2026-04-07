import { useState, useEffect } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { attemptApi } from '../../services/api.services'
import { 
  ChevronLeft, ChevronRight, Play, 
  MessageSquare
} from 'lucide-react'
import toast from 'react-hot-toast'
import Editor from '@monaco-editor/react'


export default function MixedRound() {
  const { roundId } = useParams()
  const navigate = useNavigate()
  const { 
    setAttemptId, setStrikes, setTimer, setRoundTitle,
    questions, setQuestions, currentIndex, setCurrentIndex,
    setSessionId, setFaceDescriptor
  } = useOutletContext<any>()
  
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)

  // State for different question types
  const [mcqAnswers, setMcqAnswers] = useState<Record<string, string>>({})
  const [codingCodes, setCodingCodes] = useState<Record<string, string>>({})
  const [interviewAnswers, setInterviewAnswers] = useState<Record<string, string>>({})
  const [selectedLanguage, setSelectedLanguage] = useState('javascript')
  const [running, setRunning] = useState(false)
  const [consoleOutput, setConsoleOutput] = useState('')
  const [interviewMode] = useState<'TEXT' | 'AUDIO'>('TEXT')

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
      
      // Initialize states based on question types
      const initialCodes: Record<string, string> = {}
      data.questions.forEach((q: any) => {
        if (q.type === 'CODING') {
          initialCodes[q.id] = (q.starterCode as any)?.[selectedLanguage] || ''
        }
      })
      setCodingCodes(initialCodes)
      
      setRoundTitle('Mixed Assessment')
      setTimer(data.attempt.timeLimitMinutes * 60)
      setStrikes(data.attempt.strikeCount)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start attempt')
      navigate('/candidate/lobby')
    } finally {
      setLoading(false)
    }
  }

  // ── MCQ Handlers ──────────────────────────────────────────
  const handleMcqSelect = (optionId: string) => {
    const qId = questions[currentIndex].id
    setMcqAnswers({ ...mcqAnswers, [qId]: optionId })
    attemptApi.submitMCQ({
      attemptId: attempt.id,
      questionId: qId,
      selectedOptionId: optionId,
      timeTakenSeconds: 0
    }).catch(console.error)
  }

  // ── Coding Handlers ───────────────────────────────────────
  const handleCodeChange = (value: string | undefined) => {
    setCodingCodes({ ...codingCodes, [questions[currentIndex].id]: value || '' })
  }

  const handleRunCode = async () => {
    setRunning(true)
    setConsoleOutput('Executing...')
    try {
      const qId = questions[currentIndex].id
      const data = await attemptApi.runCoding({
        attemptId: attempt.id,
        questionId: qId,
        sourceCode: codingCodes[qId],
        language: selectedLanguage,
      })

      const lines = (data.results || []).map((result: any) => {
        const header = `Case ${result.caseIndex + 1}: ${result.passed ? 'PASSED' : 'FAILED'}`
        return result.actualOutput ? `${header}\n${result.actualOutput}` : header
      })

      setConsoleOutput(lines.join('\n\n') || 'Execution completed.')
      if (data.passed === data.total) toast.success('All test cases passed!')
      else toast.error(`${data.total - data.passed} test case(s) failed.`)

      // Save draft to backend
      attemptApi.submitCoding({
        attemptId: attempt.id,
        questionId: qId,
        sourceCode: codingCodes[qId],
        language: selectedLanguage
      }).catch(() => {})
    } catch (err: any) {
      toast.error('Execution failed')
      setConsoleOutput('Error: ' + (err.response?.data?.message || err.message))
    } finally {
      setRunning(false)
    }
  }

  // ── Interview Handlers ───────────────────────────────────
  const handleInterviewChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInterviewAnswers({ ...interviewAnswers, [questions[currentIndex].id]: e.target.value })
  }

  const handleNext = async () => {
    const q = questions[currentIndex]
    
    // Auto-submit interview before moving?
    if (q.type === 'INTERVIEW_PROMPT') {
      if (!interviewAnswers[q.id]) {
        toast.error('Please provide an answer.')
        return
      }
      setSubmitting(true)
      try {
        await attemptApi.submitInterview({
          attemptId: attempt.id,
          questionId: q.id,
          mode: interviewMode,
          textAnswer: interviewAnswers[q.id],
          timeTakenSeconds: 0
        })
      } catch (err) {
        toast.error('Failed to save answer')
        setSubmitting(false)
        return
      }
      setSubmitting(false)
    }

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      handleFinish()
    }
  }

  const handleFinish = async () => {
    if (!window.confirm('Submit your assessment?')) return
    setSubmitting(true)
    try {
      const res = await attemptApi.complete(attempt.id)
      if (res.advancement?.outcome === 'ADVANCED') {
        toast.success('Assessment submitted! Advancing to next round...')
        navigate(`/candidate/assessment/${res.advancement.nextRound.id}`)
      } else {
        toast.success('Assessment submitted!')
        navigate('/candidate/lobby')
      }
    } catch (err) {
      toast.error('Failed to complete')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="spinner" />

  const q = questions[currentIndex]
  if (!q) return <div>No questions assigned.</div>

  const renderMCQ = () => (
    <div style={{ padding: '0 24px', maxWidth: '800px', width: '100%' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>
          <span>QUESTION {currentIndex + 1} OF {questions.length}</span>
          <span style={{ color: 'var(--orange)' }}>{q.difficulty}</span>
        </div>
        <h2 style={{ fontSize: '1.4rem', color: 'var(--cream)' }}>{q.stem}</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '40px' }}>
        {(q.options as any[]).map((opt: any) => (
          <label key={opt.id} style={{
            padding: '16px 20px', borderRadius: '10px',
            border: `1px solid ${mcqAnswers[q.id] === opt.id ? 'var(--orange)' : 'var(--border)'}`,
            background: mcqAnswers[q.id] === opt.id ? 'rgba(251, 133, 30, 0.05)' : 'var(--bg-elevated)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <input type="radio" checked={mcqAnswers[q.id] === opt.id} onChange={() => handleMcqSelect(opt.id)} />
            <span style={{ color: mcqAnswers[q.id] === opt.id ? 'var(--cream)' : 'var(--text-secondary)' }}>{opt.text}</span>
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
        <button className="btn btn-secondary" disabled={currentIndex === 0} onClick={() => setCurrentIndex(currentIndex - 1)}>
          <ChevronLeft size={18} /> Previous
        </button>
        <button className="btn btn-primary" onClick={handleNext}>
          {currentIndex === questions.length - 1 ? 'Finish' : 'Next'} <ChevronRight size={18} />
        </button>
      </div>
    </div>
  )

  const renderCoding = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', height: '100%', overflow: 'hidden', gap: '2px', background: 'var(--border)' }}>
      <div style={{ padding: '24px', overflowY: 'auto', background: 'var(--bg-card)' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
          TASK {currentIndex + 1} OF {questions.length} | <span style={{ color: 'var(--orange)' }}>{q.difficulty}</span>
        </div>
        <h2 style={{ color: 'var(--cream)', marginBottom: '16px', fontSize: '1.2rem' }}>{q.problemTitle}</h2>
        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.9rem' }}>{q.problemStatement}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-card)' }}>
        <div style={{ padding: '8px 16px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <select value={selectedLanguage} onChange={e => setSelectedLanguage(e.target.value)} style={{ background: 'var(--bg-card)', color: '#fff', border: '1px solid var(--border)', padding: '2px 8px', fontSize: '0.8rem' }}>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
          </select>
          <button className="btn btn-xs btn-secondary" onClick={handleRunCode} disabled={running}><Play size={14} /> Run</button>
        </div>
        <div style={{ flex: 1 }}>
          <Editor height="100%" language={selectedLanguage} theme="vs-dark" value={codingCodes[q.id] || ''} onChange={handleCodeChange} options={{ minimap: { enabled: false }, fontSize: 13 }} />
        </div>
        <div style={{ height: '100px', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', padding: '8px' }}>
           <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>CONSOLE</div>
           <div style={{ color: 'var(--green-light)', fontSize: '0.75rem', fontFamily: 'monospace', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
             {consoleOutput || (running ? 'Executing...' : 'Ready.')}
           </div>
        </div>
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
           <button className="btn btn-sm btn-secondary" onClick={() => setCurrentIndex(currentIndex - 1)} disabled={currentIndex === 0}>Prev</button>
           <button className="btn btn-sm btn-primary" onClick={handleNext}>{currentIndex === questions.length - 1 ? 'Finish' : 'Next'}</button>
        </div>
      </div>
    </div>
  )

  const renderInterview = () => (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 24px', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <MessageSquare size={24} color="var(--orange)" />
        <h2 style={{ color: 'var(--cream)', fontSize: '1.2rem' }}>Candidate Interview | Q{currentIndex + 1}</h2>
      </div>

      <div className="card" style={{ background: 'rgba(251, 133, 30, 0.05)', padding: '24px', marginBottom: '24px', borderLeft: '3px solid var(--orange)' }}>
         <p style={{ color: 'var(--cream)', fontSize: '1.1rem', lineHeight: 1.5 }}>{q.prompt}</p>
      </div>

      <textarea 
        value={interviewAnswers[q.id] || ''} 
        onChange={handleInterviewChange}
        placeholder="Type your answer..."
        style={{ width: '100%', minHeight: '180px', background: 'var(--bg-card)', color: '#fff', border: '1px solid var(--border)', padding: '16px', borderRadius: '12px', outline: 'none' }}
      />

      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
        <button className="btn btn-secondary" onClick={() => setCurrentIndex(currentIndex - 1)} disabled={currentIndex === 0}>Back</button>
        <button className="btn btn-primary" onClick={handleNext} disabled={submitting}>
          {submitting ? 'Saving...' : currentIndex === questions.length - 1 ? 'Complete Assessment' : 'Next Question'}
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', gap: '24px', height: '100%', alignItems: 'stretch' }}>
       {/* Left: Main Assessment */}
       <div style={{ flex: 1, height: '100%', overflowY: 'auto' }}>
          {q.type === 'MCQ' && renderMCQ()}
          {q.type === 'CODING' && renderCoding()}
          {q.type === 'INTERVIEW_PROMPT' && renderInterview()}
       </div>

       {/* Right: Proctoring Hub */}
       <div style={{ width: '300px', flexShrink: 0 }}>
          <div className="card" style={{ background: 'var(--bg-elevated)', padding: '16px' }}>
             <h4 style={{ fontSize: '0.8rem', color: 'var(--cream)', marginBottom: '8px' }}>Candidate Resources</h4>
             <ul style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', paddingLeft: '16px' }}>
                <li>Do not leave the browser tab.</li>
                <li>Stay in good lighting.</li>
                <li>Your video is being monitored by AI.</li>
             </ul>
          </div>
       </div>
    </div>
  )
}
