import { useState, useEffect } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { attemptApi } from '../../services/api.services'
import { Play, Send, ChevronLeft, ChevronRight, Terminal } from 'lucide-react'
import toast from 'react-hot-toast'
import Editor from '@monaco-editor/react'


export default function CodingRound() {
  const { roundId } = useParams()
  const navigate = useNavigate()
  const { setAttemptId, setStrikes, setTimer, setRoundTitle, setSessionId, setFaceDescriptor } = useOutletContext<any>()
  
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  // Editor state
  const [codes, setCodes] = useState<Record<string, string>>({})
  const [selectedLanguage, setSelectedLanguage] = useState('javascript')
  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [consoleOutput, setConsoleOutput] = useState('')
  const [testResults, setTestResults] = useState<any[] | null>(null)

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
      
      const initialCodes: Record<string, string> = {}
      data.questions.forEach((q: any) => {
        initialCodes[q.id] = (q.starterCode as any)?.[selectedLanguage] || ''
      })
      setCodes(initialCodes)
      
      setRoundTitle(data.attempt.roundType || 'Coding Assessment')
      setTimer(data.attempt.timeLimitMinutes * 60)
      setStrikes(data.attempt.strikeCount)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start attempt')
      navigate('/candidate/lobby')
    } finally {
      setLoading(false)
    }
  }

  const handleCodeChange = (value: string | undefined) => {
    setCodes({ ...codes, [questions[currentIndex].id]: value || '' })
  }

  const handleRun = async () => {
    setRunning(true)
    setConsoleOutput('Executing test cases...')
    setTestResults(null)
    try {
      const qId = questions[currentIndex].id
      const data = await attemptApi.runCoding({
        attemptId: attempt.id,
        questionId: qId,
        sourceCode: codes[qId],
        language: selectedLanguage
      })

      setTestResults(data.results)
      setConsoleOutput(`Passed ${data.passed}/${data.total} public test cases.`)
      
      if (data.passed === data.total) {
        toast.success('All public test cases passed!')
      } else {
        toast.error(`${data.total - data.passed} test cases failed.`)
      }
    } catch (err: any) {
      toast.error('Execution failed')
      setConsoleOutput('Error: ' + (err.response?.data?.message || err.message))
    } finally {
      setRunning(false)
    }
  }

  const handleFinish = async () => {
    if (!window.confirm('Submit all coding problems?')) return
    setSubmitting(true)
    try {
      // 1. Save ALL code drafts first to ensure persistence
      await Promise.all(
        questions.map(q => 
          attemptApi.submitCoding({
            attemptId: attempt.id,
            questionId: q.id,
            sourceCode: codes[q.id] || '',
            language: selectedLanguage
          }).catch(err => console.error(`Failed to save Q ${q.id}:`, err))
        )
      )

      // 2. Complete the effort
      const res = await attemptApi.complete(attempt.id)
      if (res.advancement?.outcome === 'ADVANCED') {
        toast.success('Assessment completed! Advancing to next round...')
        navigate(`/candidate/assessment/${res.advancement.nextRound.id}`)
      } else {
        toast.success('Assessment completed!')
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
  if (!q) return <div>No tasks.</div>

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', overflow: 'hidden' }}>
      {/* Problem Description */}
      <div style={{ padding: '32px', overflowY: 'auto', borderRight: '1px solid var(--border)', background: 'rgba(239, 234, 227, 0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '8px' }}>
          <span>TASK {currentIndex + 1} OF {questions.length}</span>
          <span style={{ color: 'var(--orange)' }}>{q.difficulty}</span>
        </div>
        <h2 style={{ fontSize: '1.4rem', color: 'var(--cream)', marginBottom: '16px' }}>{q.problemTitle}</h2>
        <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
          {q.problemStatement}
        </div>

        {q.constraints && (
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{ color: 'var(--cream)', fontSize: '0.9rem', marginBottom: '8px' }}>Constraints</h4>
            <pre style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
              {q.constraints}
            </pre>
          </div>
        )}

        {q.examples && (q.examples as any[]).map((ex, i) => (
          <div key={i} style={{ marginBottom: '16px' }}>
            <h4 style={{ color: 'var(--cream)', fontSize: '0.9rem', marginBottom: '8px' }}>Example {i+1}</h4>
            <div style={{ background: 'var(--bg-elevated)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem' }}>
              <div style={{ marginBottom: '4px' }}><span style={{ color: 'var(--green-light)' }}>Input:</span> {ex.input}</div>
              <div><span style={{ color: 'var(--orange)' }}>Output:</span> {ex.output}</div>
              {ex.explanation && <div style={{ marginTop: '8px', fontStyle: 'italic', color: 'var(--text-muted)' }}>{ex.explanation}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Editor & Console */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Editor Toolbar */}
        <div style={{ padding: '12px 24px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <select 
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            style={{ background: 'var(--bg-card)', color: 'var(--cream)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 8px' }}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={handleRun} disabled={running}>
              <Play size={16} /> Run Code
            </button>
          </div>
        </div>

        {/* Editor */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <Editor
            height="100%"
            language={selectedLanguage}
            value={codes[q.id] || ''}
            onChange={handleCodeChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: 'monospace',
              lineHeight: 1.5,
              padding: { top: 20 },
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>

        {/* Console / Footer */}
        <div style={{ height: '200px', background: 'var(--bg-card)', borderTop: '2px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
           <div style={{ padding: '8px 16px', background: 'rgba(251, 133, 30, 0.05)', borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={14} /> CONSOLE
           </div>
           <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
              {!testResults ? (
                <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {consoleOutput || 'Ready. Click "Run Code" to test.'}
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(251, 133, 30, 0.05)', color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>Test Case</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>Input</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>Expected</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>Actual</th>
                      <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testResults.map((res, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>Case {i + 1}</td>
                        <td style={{ padding: '8px', color: 'var(--cream)', fontFamily: 'monospace' }}>{res.input || '[]'}</td>
                        <td style={{ padding: '8px', color: 'var(--green-light)', fontFamily: 'monospace' }}>{res.expectedOutput}</td>
                        <td style={{ padding: '8px', color: res.passed ? 'var(--green-light)' : 'var(--red)', fontFamily: 'monospace' }}>
                          {res.actualOutput || (res.status?.description || 'N/A')}
                        </td>
                        <td style={{ padding: '8px', fontWeight: 600, color: res.passed ? 'var(--green-dark)' : 'var(--red)' }}>
                          {res.passed ? 'PASS' : 'FAIL'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
           </div>
           
           <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" disabled={currentIndex === 0} onClick={() => setCurrentIndex(currentIndex - 1)}>
                  <ChevronLeft size={16} /> Previous
                </button>
                <button className="btn btn-secondary btn-sm" disabled={currentIndex === questions.length - 1} onClick={() => setCurrentIndex(currentIndex + 1)}>
                   Next <ChevronRight size={16} />
                </button>
              </div>

              <button className="btn btn-primary" onClick={handleFinish} disabled={submitting}>
                <Send size={16} /> {submitting ? 'Submitting...' : 'Finish Attempt'}
              </button>
           </div>
        </div>
      </div>
    </div>
  )
}
