import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { attemptApi } from '../../services/api.services'
import { uploadToCloudinary } from '../../utils/cloudinary.util'
import toast from 'react-hot-toast'
import Editor from '@monaco-editor/react'

import { Play, Mic, Square, CheckCircle, Code2, AlertTriangle, MessageSquare } from 'lucide-react'

// Basic layout from CodingRound, adapted to 2 phases
export default function LiveCodingRound() {
  const { roundId } = useParams()
  const navigate = useNavigate()
  const { setAttemptId, setStrikes, setTimer, setRoundTitle, setSessionId, setFaceDescriptor } = useOutletContext<any>()
  
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  // Phase 1 state
  const [sourceCode, setSourceCode] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [running, setRunning] = useState(false)
  const [consoleOutput, setConsoleOutput] = useState('')
  const [testResults, setTestResults] = useState<any[] | null>(null)
  
  // Transition state
  const [phase, setPhase] = useState<1 | 'transition' | 2 | 'completed'>(1)
  const [answerId, setAnswerId] = useState<string>('')
  const [explanationPrompt, setExplanationPrompt] = useState<string>('')
  const [codeScore, setCodeScore] = useState(0)

  // Phase 2 state
  const [recording, setRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string>('')
  const [submittingPhase2, setSubmittingPhase2] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Final Results
  const [phase2Result, setPhase2Result] = useState<any>(null)

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
      setRoundTitle('Live Coding')
      setTimer(data.attempt.timeLimitMinutes * 60)
      setStrikes(data.attempt.strikeCount)
      
      if (data.questions.length > 0) {
        setSourceCode(data.questions[0].liveCodingStarter || '')
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start attempt')
      navigate('/candidate/lobby')
    } finally {
      setLoading(false)
    }
  }

  // --- Phase 1: Code ---
  const handleTestCode = async () => {
    setRunning(true)
    setConsoleOutput('Executing test cases...')
    setTestResults(null)
    try {
      const data = await attemptApi.runCoding({
        attemptId: attempt.id,
        questionId: q.id,
        sourceCode: sourceCode,
        language: language
      })
      setTestResults(data.results)
      setConsoleOutput(`Passed ${data.passed}/${data.total} public test cases.`)
      if (data.passed === data.total) toast.success('All public test cases passed!')
      else toast.error(`${data.total - data.passed} test cases failed.`)
    } catch (err: any) {
      toast.error('Execution failed')
      setConsoleOutput('Error: ' + (err.response?.data?.message || err.message))
    } finally {
      setRunning(false)
    }
  }

  const handleSubmitCode = async () => {
    if (!sourceCode.trim()) {
      toast.error('Please write some code before submitting.')
      return
    }

    setRunning(true)
    try {
      const result = await attemptApi.submitLiveCodingCode({
        attemptId: attempt.id,
        questionId: questions[currentIndex].id,
        language,
        sourceCode
      })
      
      setAnswerId(result.answerId)
      setCodeScore(result.codeScore)
      setExplanationPrompt(result.explanationPrompt)
      setPhase('transition')
    } catch (err) {
      toast.error('Failed to submit code phase')
    } finally {
      setRunning(false)
    }
  }

  // --- Phase 2: Audio Explanation ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      audioChunksRef.current = []

      mr.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mr.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(t => t.stop())
        try {
          const toastId = toast.loading('Uploading audio...')
          const uploadedUrl = await uploadToCloudinary(audioBlob, 'smarthire_audio')
          setAudioUrl(uploadedUrl)
          toast.success('Audio ready to submit', { id: toastId })
        } catch (error) {
          toast.error('Failed to upload audio to Cloudinary')
        }
      }

      mr.start()
      mediaRecorderRef.current = mr
      setRecording(true)
    } catch (err) {
      toast.error('Microphone access denied')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setRecording(false)
    }
  }

  const handleSubmitExplanation = async () => {
    if (!audioUrl) return toast.error('Please record your explanation first')
    
    setSubmittingPhase2(true)
    try {
      const result = await attemptApi.submitLiveCodingExplain({
        attemptId: attempt.id,
        answerId: answerId,
        questionId: questions[currentIndex].id,
        audioUrl: audioUrl
      } as any) // Note: api.services.ts currently has FormData, we need to fix it to accept JSON

      setPhase2Result(result)
      setPhase('completed')
    } catch (err) {
      toast.error('Failed to submit explanation')
    } finally {
      setSubmittingPhase2(false)
    }
  }

  const handleNextProblem = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setPhase(1)
      setSourceCode(questions[currentIndex + 1].liveCodingStarter || '')
      setPhase2Result(null)
      setAudioUrl('')
    } else {
      handleFinishRound()
    }
  }

  const handleFinishRound = async () => {
    try {
      const res = await attemptApi.complete(attempt.id)
      if (res.advancement?.outcome === 'ADVANCED') {
        toast.success('Live Coding round completed! Advancing to next round...')
        navigate(`/candidate/assessment/${res.advancement.nextRound.id}`)
      } else {
        toast.success('Live Coding round completed!')
        navigate('/candidate/lobby')
      }
    } catch (err) {
      toast.error('Failed to complete round')
    }
  }

  if (loading || !attempt) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><div className="spinner" /></div>
  }

  const q = questions[currentIndex]
  if (!q) return <div>No live coding questions assigned.</div>

  const isTransition = phase === 'transition'
  const isExplain = phase === 2
  const isCompleted = phase === 'completed'

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* LEFT PANEL */}
      <div style={{ width: '40%', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)' }}>
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--teal)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
            Problem {currentIndex + 1} of {questions.length}
          </div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--cream)', marginBottom: '16px' }}>{q.problemTitle || 'Live Coding Problem'}</h2>
          
          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.95rem', marginBottom: '24px', whiteSpace: 'pre-wrap' }}>
            {q.liveCodingProblem || q.problemStatement}
          </div>

          {(q.liveCodingTestCases || []).length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--cream)', marginBottom: '12px' }}>Visible Test Cases</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(q.liveCodingTestCases || []).map((tc: any, i: number) => (
                  <div key={i} style={{ background: 'var(--bg-base)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
                    <div style={{ color: 'var(--orange)', fontWeight: 600, marginBottom: '6px' }}>Input:</div>
                    <code style={{ display: 'block', background: 'var(--bg-elevated)', padding: '6px 10px', borderRadius: '4px', marginBottom: '10px' }}>{tc.input}</code>
                    <div style={{ color: 'var(--teal)', fontWeight: 600, marginBottom: '6px' }}>Expected Output:</div>
                    <code style={{ display: 'block', background: 'var(--bg-elevated)', padding: '6px 10px', borderRadius: '4px' }}>{tc.expectedOutput}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ width: '60%', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)' }}>
        
        {phase === 1 && (
          <>
            <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <select className="form-select" style={{ width: '150px' }} value={language} onChange={e => setLanguage(e.target.value)}>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-outline btn-sm" onClick={handleTestCode} disabled={running}>
                  <Play size={14} /> Run Tests
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleSubmitCode} disabled={running}>
                  {running ? <div className="spinner spinner-sm" /> : <><Code2 size={14} /> Submit Code Phase</>}
                </button>
              </div>
            </div>
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              <Editor
                height="100%"
                language={language}
                theme="vs-dark"
                value={sourceCode}
                onChange={(val) => setSourceCode(val || '')}
                options={{ minimap: { enabled: false }, fontSize: 13 }}
              />
            </div>

            {/* Console Output area */}
            <div style={{ height: '30%', borderTop: '1px solid var(--border)', background: 'var(--bg-black)', display: 'flex', flexDirection: 'column' }}>
               <div style={{ padding: '8px 16px', background: 'rgba(251, 133, 30, 0.05)', borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                CONSOLE
             </div>
             <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
                {!testResults ? (
                  <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {consoleOutput || 'Ready. Click "Run Tests" to execute against basic input.'}
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
            </div>
          </>
        )}

        {isTransition && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
            <div className="card fade-in" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--green-soft)', color: 'var(--green-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle size={32} />
              </div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--cream)', marginBottom: '8px' }}>Code Submitted!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                Your code scored: <strong style={{ color: 'var(--green)' }}>{codeScore * 10}%</strong> based on test cases.
              </p>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '16px 0' }} />
              <p style={{ color: 'var(--orange)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>Phase 2: Explanation</p>
              <p style={{ color: 'var(--cream)', fontSize: '0.85rem', marginBottom: '24px', fontStyle: 'italic' }}>
                "{explanationPrompt}"
              </p>
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setPhase(2)}>
                Continue to Recording
              </button>
            </div>
          </div>
        )}

        {isExplain && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--teal-soft)', border: '1px solid var(--teal)', borderRadius: 'var(--radius-md)', marginBottom: '24px' }}>
              <MessageSquare size={24} style={{ color: 'var(--teal)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--teal)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>AI Prompt</div>
                <div style={{ color: 'var(--cream)', fontSize: '0.95rem' }}>{explanationPrompt}</div>
              </div>
            </div>

            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Your Submitted Code (Read-only)</h3>
            <pre style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', overflow: 'auto', margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem', fontFamily: 'monospace' }}>
              {sourceCode}
            </pre>

            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              {!audioUrl ? (
                <>
                  <button 
                    onClick={recording ? stopRecording : startRecording}
                    className={`btn ${recording ? 'btn-danger' : 'btn-primary'}`} 
                    style={{
                      width: '64px', height: '64px', borderRadius: '50%', padding: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      animation: recording ? 'pulseBadge 1.5s infinite' : 'none'
                    }}
                  >
                    {recording ? <Square size={24} /> : <Mic size={24} />}
                  </button>
                  <div style={{ color: recording ? 'var(--red)' : 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: recording ? 600 : 400 }}>
                    {recording ? 'Recording... click to stop' : 'Click to start recording'}
                  </div>
                </>
              ) : (
                <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <audio src={audioUrl} controls style={{ width: '100%', height: '40px' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setAudioUrl('')}>Re-record</button>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmitExplanation} disabled={submittingPhase2}>
                      {submittingPhase2 ? <div className="spinner spinner-sm" /> : 'Submit Explanation'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isCompleted && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
            <div className="card fade-in" style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--green-soft)', color: 'var(--green-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle size={32} />
              </div>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--cream)', marginBottom: '8px' }}>Awesome!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
                Your code and explanation have been processed by the AI.
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Code Score</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--orange)' }}>{phase2Result?.codeScore}/10</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Explanation Score</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--teal)' }}>{(phase2Result?.explainScore || 0).toFixed(1)}/10</div>
                </div>
              </div>

              {phase2Result?.copiedCodeSignal && (
                <div style={{ padding: '12px', background: 'var(--red-soft)', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', color: 'var(--red)', fontSize: '0.85rem', display: 'flex', alignItems: 'flex-start', gap: '8px', textAlign: 'left', marginBottom: '24px' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>Note: AI detected that your explanation may not strongly match your code implementation.</div>
                </div>
              )}

              <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleNextProblem}>
                {currentIndex < questions.length - 1 ? 'Next Problem' : 'Complete Round'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
