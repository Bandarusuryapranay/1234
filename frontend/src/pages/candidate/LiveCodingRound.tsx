import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { attemptApi } from '../../services/api.services'
import { uploadToCloudinary } from '../../utils/cloudinary.util'
import toast from 'react-hot-toast'

import Editor from '@monaco-editor/react'

// Simple Local Error Boundary
class LocalErrorBoundary extends React.Component<{ children: any }, { hasError: boolean }> {
  constructor(props: any) { super(props); this.state = { hasError: false } }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) return (
      <div style={{ padding: 20, background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 8, fontSize: '0.85rem' }}>
        <p style={{ fontWeight: 700 }}>Editor Initialization Failed</p>
        <p>There was a conflict loading the code editor. Please try refreshing the page.</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: 10, padding: '4px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Refresh</button>
      </div>
    )
    return this.props.children
  }
}

import { 
  Play, Mic, Square, CheckCircle, Code2, AlertTriangle, MessageSquare,
  AlignLeft, Type, Sun, Moon, ChevronDown, ChevronUp, Terminal,
  CheckCircle2, XCircle
} from 'lucide-react'

// Basic layout from CodingRound, adapted to 2 phases

const LANG_OPTIONS = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python',     label: 'Python'     },
  { value: 'java',       label: 'Java'       },
  { value: 'cpp',        label: 'C++'        },
  { value: 'c',          label: 'C'          },
]

const FONT_SIZES = [12, 13, 14, 15, 16, 18]

const DIFF_STYLE: Record<string, {bg:string,color:string}> = {
  EASY:   { bg: 'rgba(52,211,153,0.15)',  color: '#34d399' },
  MEDIUM: { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24' },
  HARD:   { bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
}

export default function LiveCodingRound() {
  const { roundId } = useParams()
  const navigate = useNavigate()
  const { 
    setAttemptId, setStrikes, setTimer, setRoundTitle, setSessionId, setFaceDescriptor,
    questions, setQuestions, currentIndex, setCurrentIndex,
  } = useOutletContext<any>()
  
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState<any>(null)

  // Phase 1 state
  const [sourceCode, setSourceCode] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [fontSize, setFontSize] = useState(14)
  const [darkTheme, setDarkTheme] = useState(true)
  const [lineNums, setLineNums] = useState(true)
  const [running, setRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [consoleTab, setConsoleTab] = useState<'testcase'|'output'>('output')
  const [consoleOpen, setConsoleOpen] = useState(false)
  const [panelH, setPanelH] = useState(260)
  const dragY = useRef<{y:number;h:number}|null>(null)
  
  const [testResults, setTestResults] = useState<any[] | null>(null)
  
  // Transition state
  const [phase, setPhase] = useState<1 | 'transition' | 2 | 'completed'>(1)
  const [answerId, setAnswerId] = useState<string>('')
  
  const [editorReady, setEditorReady] = useState(false)
  const q = questions ? questions[currentIndex] : null
  console.log('LiveCoding state:', { hasQ: !!q, editorReady, questionsCount: questions?.length, currentIndex })

  
  useEffect(() => {
    setEditorReady(false)
    if (!loading && q) {
      const t = setTimeout(() => setEditorReady(true), 100)
      return () => clearTimeout(t)
    }
  }, [loading, q?.id, language])
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
    setTestResults(null)
    setConsoleOpen(true)
    setConsoleTab('output')
    try {
      const data = await attemptApi.runCoding({
        attemptId: attempt.id,
        questionId: q.id,
        sourceCode: sourceCode,
        language: language
      })
      setTestResults(data.results)
      if (data.passed === data.total) toast.success('All public test cases passed! 🎉')
      else toast.error(`${data.total - data.passed} test case(s) failed.`)
    } catch (err: any) {
      toast.error('Execution failed')
      setTestResults([{ passed: false, actualOutput: 'Error: ' + (err.response?.data?.message || err.message) }])
    } finally {
      setRunning(false)
    }
  }

  const handleSubmitCode = async () => {
    if (!sourceCode.trim()) {
      toast.error('Please write some code before submitting.')
      return
    }

    setSubmitting(true)
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
      setSubmitting(false)
    }
  }

  const startDrag = (e: React.MouseEvent) => {
    dragY.current = { y: e.clientY, h: panelH }
    const move = (ev: MouseEvent) => {
      if (!dragY.current) return
      setPanelH(Math.max(100, Math.min(600, dragY.current.h + (dragY.current.y - ev.clientY))))
    }
    const up = () => { dragY.current = null; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
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
          const uploadedUrl = await uploadToCloudinary(audioBlob, 'indium_audio')
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
      // Backend expects multipart/form-data for /attempt/live-coding/explain
      // We need to fetch the blob from the URL or just send the URL as a field?
      // Wait! The backend controller uses req.file.buffer.
      // So I MUST send the actual blob.
      
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
      const formData = new FormData()
      formData.append('attemptId', attempt.id)
      formData.append('answerId', answerId)
      formData.append('questionId', questions[currentIndex].id)
      formData.append('audio', audioBlob, 'explanation.webm')

      const result = await attemptApi.submitLiveCodingExplain(formData)

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

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', flexDirection:'column', gap:16 }}>
      <div className="spinner" />
      <span style={{ color:'var(--text-muted)', fontSize:'0.9rem' }}>Starting live coding session…</span>
    </div>
  )

  if (!q) return <div style={{ padding:32, color:'var(--cream)' }}>No live coding tasks found.</div>

  const isTransition = phase === 'transition'
  const isExplain = phase === 2
  const isCompleted = phase === 'completed'

  const diffStyle = DIFF_STYLE[q.difficulty] || DIFF_STYLE['MEDIUM']
  const passedCount = testResults?.filter(r => r.passed).length ?? 0

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      
      {/* ── Question meta bar ── */}
      <div style={{
        display:'flex', alignItems:'center', gap:12, padding:'8px 20px',
        background:'var(--bg-elevated)', borderBottom:'1px solid var(--border)',
        flexShrink:0, flexWrap:'wrap',
      }}>
        <div style={{
          padding:'3px 12px', borderRadius:'20px', fontSize:'0.78rem', fontWeight:700,
          background:'rgba(99,102,241,0.15)', color:'#818cf8'
        }}>
          Problem {currentIndex + 1}
        </div>
        <div style={{
          padding:'3px 10px', borderRadius:'20px', fontSize:'0.75rem', fontWeight:600,
          background: diffStyle.bg, color: diffStyle.color
        }}>
          {q.difficulty || 'MEDIUM'}
        </div>
        <div style={{
          padding:'3px 10px', borderRadius:'20px', fontSize:'0.75rem', fontWeight:500,
          background:'rgba(255,255,255,0.06)', color:'var(--text-muted)',
          display:'flex', alignItems:'center', gap:5
        }}>
          <Code2 size={11} /> live coding
        </div>
      </div>

      <div style={{ flex:1, display:'grid', gridTemplateColumns:`1fr 1fr 0px`, overflow:'hidden', transition:'grid-template-columns 0.2s' }}>
        
        {/* ── LEFT PANEL: Problem ── */}
        <div style={{ overflowY:'auto', borderRight:'1px solid var(--border)', background:'rgba(255,255,255,0.01)' }}>
          <div style={{ padding:'24px 28px' }}>
            <h2 style={{ fontSize:'1.25rem', fontWeight:700, color:'var(--cream)', marginBottom:14, lineHeight:1.3 }}>
              {q.problemTitle || 'Live Coding Problem'}
            </h2>
            <div style={{ color:'var(--text-secondary)', lineHeight:1.75, fontSize:'0.9rem', marginBottom:24, whiteSpace:'pre-wrap' }}>
              {q.liveCodingProblem || q.problemStatement}
            </div>

            {q.constraints && (
              <div style={{ marginBottom:20 }}>
                <h4 style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--cream)', marginBottom:8, letterSpacing:'0.08em', textTransform:'uppercase', display:'flex', alignItems:'center', gap:6 }}>
                  <AlignLeft size={12} /> Constraints
                </h4>
                <pre style={{
                  background:'var(--bg-elevated)', padding:'12px 16px', borderRadius:8,
                  fontSize:'0.82rem', color:'var(--text-muted)', whiteSpace:'pre-wrap',
                  margin:0, border:'1px solid var(--border)', fontFamily:'monospace'
                }}>
                  {q.constraints}
                </pre>
              </div>
            )}

            {(q.liveCodingTestCases || []).length > 0 && (
              <div style={{ marginBottom:16 }}>
                <h4 style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--cream)', marginBottom:8, letterSpacing:'0.08em', textTransform:'uppercase' }}>
                  Visible Test Cases
                </h4>
                {(q.liveCodingTestCases || []).map((tc: any, i: number) => (
                  <div key={i} style={{ marginBottom:10, background:'var(--bg-elevated)', borderRadius:10, border:'1px solid var(--border)', overflow:'hidden' }}>
                    <div style={{ padding:'10px 16px 6px', display:'flex', gap:8, flexWrap:'wrap' }}>
                      <span style={{ color:'var(--text-muted)', fontSize:'0.82rem', minWidth:56 }}>Input:</span>
                      <code style={{ color:'var(--cream)', fontFamily:'monospace', fontSize:'0.82rem', wordBreak:'break-all' }}>{tc.input}</code>
                    </div>
                    <div style={{ padding:'6px 16px 10px', display:'flex', gap:8, flexWrap:'wrap' }}>
                      <span style={{ color:'var(--text-muted)', fontSize:'0.82rem', minWidth:56 }}>Output:</span>
                      <code style={{ color:'#fb8a1e', fontFamily:'monospace', fontSize:'0.82rem' }}>{tc.expectedOutput}</code>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: Editor + Console ── */}
        <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
        
        {phase === 1 && (
          <>
            {/* ── Editor Toolbar ── */}
            <div style={{
              display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:6,
              padding:'8px 14px', background:'#1a1a2e', borderBottom:'1px solid var(--border)', flexShrink:0
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <select value={language} onChange={e => setLanguage(e.target.value)} style={{ background:'#0f0f23', color:'#e2e8f0', border:'1px solid #334155', borderRadius:6, padding:'4px 8px', fontSize:'0.82rem', cursor:'pointer', fontWeight:600 }}>
                  {LANG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <select value={fontSize} onChange={e => setFontSize(Number(e.target.value))} style={{ background:'#0f0f23', color:'var(--text-muted)', border:'1px solid #334155', borderRadius:6, padding:'4px 6px', fontSize:'0.78rem', cursor:'pointer' }}>
                  {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
                </select>
                <button onClick={() => setDarkTheme(d => !d)} title={darkTheme ? 'Switch to Light' : 'Switch to Dark'} style={{ background:'#0f0f23', border:'1px solid #334155', borderRadius:6, padding:'4px 8px', cursor:'pointer', color:'#94a3b8', display:'flex', alignItems:'center' }}>
                  {darkTheme ? <Sun size={13}/> : <Moon size={13}/>}
                </button>
                <button onClick={() => setLineNums(l => !l)} title="Toggle line numbers" style={{ background: lineNums ? 'rgba(99,102,241,0.2)' : '#0f0f23', border:'1px solid ' + (lineNums ? '#6366f1' : '#334155'), borderRadius:6, padding:'4px 8px', cursor:'pointer', color: lineNums ? '#818cf8' : '#94a3b8', display:'flex', alignItems:'center', gap:4, fontSize:'0.75rem', fontWeight:600 }}>
                  <Type size={11}/> 1:1
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleTestCode} disabled={running} style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:8, border:'1px solid #334155', cursor: running ? 'not-allowed' : 'pointer', fontWeight:600, fontSize:'0.8rem', background: 'transparent', color: '#e2e8f0' }}>
                  <Play size={13} style={{ fill:'#e2e8f0' }}/> Run Tests
                </button>
                <button onClick={handleSubmitCode} disabled={submitting} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 18px', borderRadius:8, border:'none', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight:700, fontSize:'0.85rem', background: submitting ? '#1e293b' : 'linear-gradient(135deg,#22c55e,#16a34a)', color: submitting ? '#64748b' : '#fff', transition:'all 0.2s', boxShadow: submitting ? 'none' : '0 0 16px rgba(34,197,94,0.3)' }}>
                  {submitting ? <><div className="spinner spinner-sm" style={{ borderTopColor:'#64748b' }} /> Wait…</> : <><Code2 size={14} style={{ fill:'#fff' }}/> Submit Phase</>}
                </button>
              </div>
            </div>

            {/* ── Monaco Editor ── */}
            <div style={{ flex:1, overflow:'hidden', position:'relative', height: '100%' }}>
              {q && editorReady && (
                <LocalErrorBoundary>
                  <div style={{ height: '100%', width: '100%' }}>
                    <Editor
                      key={`editor-${q.id || 'default'}-${language}`}
                      height="100%"
                      width="100%"
                      language={language || 'javascript'}
                      defaultValue={sourceCode || ''}
                      onMount={(editor) => {
                        editor.onDidChangeModelContent(() => {
                          setSourceCode(editor.getValue());
                        });
                      }}
                      theme={darkTheme ? 'vs-dark' : 'light'}
                      options={{
                        minimap: { enabled: false },
                        fontSize: fontSize,
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                        fontFamily: "'Cascadia Code','Fira Code',monospace",
                        renderLineHighlight: 'gutter',
                        lineNumbers: lineNums ? 'on' : 'off',
                        bracketPairColorization: { enabled: true },
                        guides: { bracketPairs: true },
                      }}
                    />
                  </div>
              </LocalErrorBoundary>
              )}
            </div>

            <div onMouseDown={startDrag} style={{ height:5, background:'#1e293b', cursor:'row-resize', flexShrink:0, borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }} />

            {/* ── Console Panel ── */}
            <div style={{ height: consoleOpen ? panelH : 42, flexShrink:0, display:'flex', flexDirection:'column', background:'#0a0a14', transition:'height 0.2s ease', overflow:'hidden' }}>
              <div style={{ height:42, display:'flex', alignItems:'stretch', borderBottom:'1px solid #1e293b', flexShrink:0 }}>
                <button onClick={() => { setConsoleTab('testcase'); setConsoleOpen(true) }} style={{ display:'flex', alignItems:'center', gap:6, padding:'0 16px', border:'none', cursor:'pointer', fontSize:'0.78rem', fontWeight:600, background:'transparent', borderBottom: consoleOpen && consoleTab === 'testcase' ? '2px solid #6366f1' : '2px solid transparent', color: consoleOpen && consoleTab === 'testcase' ? '#818cf8' : '#64748b', transition:'color 0.15s' }}>
                  <AlignLeft size={12}/> Testcase
                </button>
                <button onClick={() => { setConsoleTab('output'); setConsoleOpen(true) }} style={{ display:'flex', alignItems:'center', gap:6, padding:'0 16px', border:'none', cursor:'pointer', fontSize:'0.78rem', fontWeight:600, background:'transparent', borderBottom: consoleOpen && consoleTab === 'output' ? '2px solid #6366f1' : '2px solid transparent', color: consoleOpen && consoleTab === 'output' ? '#818cf8' : '#64748b', transition:'color 0.15s' }}>
                  <Terminal size={12}/> Output {testResults && <span style={{ marginLeft:4, padding:'1px 7px', borderRadius:20, fontSize:'0.7rem', fontWeight:700, background: passedCount === testResults.length ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)', color: passedCount === testResults.length ? '#34d399' : '#f87171' }}>{passedCount}/{testResults.length}</span>}
                </button>
                <button onClick={() => setConsoleOpen(o => !o)} style={{ marginLeft:'auto', padding:'0 14px', background:'transparent', border:'none', cursor:'pointer', color:'#475569' }}>
                  {consoleOpen ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
                </button>
              </div>

              {consoleOpen && (
                <div style={{ flex:1, overflowY:'auto', padding:'14px 18px' }}>
                  {consoleTab === 'testcase' && (
                    <div>
                      <div style={{ fontSize:'0.78rem', color:'#64748b', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>Sample Test Cases</div>
                      {((q.liveCodingTestCases && q.liveCodingTestCases.length > 0) ? q.liveCodingTestCases : []).map((ex: any, i: number) => (
                        <div key={i} style={{ marginBottom:10, background:'#0f172a', borderRadius:8, padding:'10px 14px', border:'1px solid #1e293b' }}>
                          <div style={{ fontSize:'0.75rem', color:'#64748b', marginBottom:6 }}>Testcase {i+1}</div>
                          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                            <span style={{ color:'#64748b', fontSize:'0.8rem', minWidth:56 }}>Input:</span>
                            <code style={{ color:'#e2e8f0', fontFamily:'monospace', fontSize:'0.82rem' }}>{ex.input}</code>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {consoleTab === 'output' && (
                    <div>
                      {!testResults ? (
                        <div style={{ color:'#475569', fontSize:'0.85rem', fontFamily:'monospace' }}>
                          Click <strong style={{ color:'#22c55e' }}>Run Tests</strong> to see your output here.
                        </div>
                      ) : (
                        <>
                          <div style={{ display:'flex', alignItems:'center', gap:16, padding:'10px 16px', borderRadius:8, background: passedCount === testResults.length ? 'rgba(22,163,74,0.1)' : 'rgba(185,28,28,0.1)', border: `1px solid ${passedCount === testResults.length ? 'rgba(22,163,74,0.3)' : 'rgba(185,28,28,0.3)'}`, marginBottom:12 }}>
                            {passedCount === testResults.length ? <CheckCircle2 size={18} style={{ color:'#22c55e' }} /> : <XCircle size={18} style={{ color:'#ef4444' }} />}
                            <div>
                              <div style={{ fontWeight:700, fontSize:'0.88rem', color: passedCount === testResults.length ? '#22c55e' : '#ef4444' }}>{passedCount === testResults.length ? 'All Test Cases Passed' : 'Some Test Cases Failed'}</div>
                              <div style={{ fontSize:'0.78rem', color:'#94a3b8' }}>Test Cases Passed: {passedCount}/{testResults.length}</div>
                            </div>
                          </div>
                          {testResults.map((res: any, i: number) => (
                            <div key={i} style={{ marginBottom:10, borderRadius:8, border:`1px solid ${res.passed ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, overflow:'hidden' }}>
                              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px', background: res.passed ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.08)' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                  {res.passed ? <CheckCircle2 size={13} style={{ color:'#22c55e' }} /> : <XCircle size={13} style={{ color:'#ef4444' }} />}
                                  <span style={{ fontSize:'0.8rem', fontWeight:700, color: res.passed ? '#22c55e' : '#ef4444' }}>Test Case {i + 1}</span>
                                </div>
                                <span style={{ fontSize:'0.72rem', fontWeight:700, padding:'2px 10px', borderRadius:20, background: res.passed ? 'rgba(22,163,74,0.2)' : 'rgba(185,28,28,0.25)', color: res.passed ? '#4ade80' : '#fca5a5' }}>
                                  {res.passed ? '✓ Passed' : '✗ Failed'}
                                </span>
                              </div>
                              <div style={{ padding:'10px 14px', display:'grid', gridTemplateColumns:'90px 1fr', rowGap:6, columnGap:12, fontSize:'0.8rem' }}>
                                {res.input !== undefined && <><span style={{ color:'#64748b' }}>Stdout:</span><code style={{ color:'#cbd5e1', fontFamily:'monospace', wordBreak:'break-all' }}>{String(res.input) || '—'}</code></>}
                                <span style={{ color:'#64748b' }}>Expected:</span><code style={{ color:'#86efac', fontFamily:'monospace' }}>{res.expectedOutput ?? '—'}</code>
                                <span style={{ color:'#64748b' }}>Your Output:</span><code style={{ color: res.passed ? '#86efac' : '#fca5a5', fontFamily:'monospace', wordBreak:'break-all' }}>{res.actualOutput || 'No output'}</code>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
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
    </div>
  )
}
