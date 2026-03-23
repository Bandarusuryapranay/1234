import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { attemptApi } from '../../services/api.services'
import {
  Play, Send, ChevronLeft, ChevronRight, RotateCcw,
  CheckCircle2, XCircle, Bookmark, BookmarkCheck, Code2,
  AlignLeft, Type, Sun, Moon, ChevronDown, ChevronUp, Terminal
} from 'lucide-react'
import toast from 'react-hot-toast'
import Editor from '@monaco-editor/react'


const LANG_OPTIONS = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python',     label: 'Python'     },
  { value: 'java',       label: 'Java'       },
  { value: 'cpp',        label: 'C++'        },
  { value: 'c',          label: 'C'          },
]

const FONT_SIZES = [12, 13, 14, 15, 16, 18]

const LANG_DEFAULTS: Record<string, string> = {
  javascript: '// Write your solution here\n\n',
  python:     '# Write your solution here\n\n',
  java:       'public class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n',
  cpp:        '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n',
  c:          '#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n',
}

const DIFF_STYLE: Record<string, {bg:string,color:string}> = {
  EASY:   { bg: 'rgba(52,211,153,0.15)',  color: '#34d399' },
  MEDIUM: { bg: 'rgba(251,191,36,0.15)',  color: '#fbbf24' },
  HARD:   { bg: 'rgba(248,113,113,0.15)', color: '#f87171' },
}

/* ── Component ───────────────────────────────────────────── */
export default function CodingRound() {
  const { roundId } = useParams()
  const navigate    = useNavigate()
  const {
    setAttemptId, setStrikes, setTimer, setRoundTitle, setSessionId, setFaceDescriptor,
    questions, setQuestions, currentIndex, setCurrentIndex,
  } = useOutletContext<any>()

  /* state */
  const [loading,   setLoading]   = useState(true)
  const [attempt,   setAttempt]   = useState<any>(null)
  const [codes,     setCodes]     = useState<Record<string, Record<string, string>>>({})
  const [lang,      setLang]      = useState('javascript')
  const [fontSize,  setFontSize]  = useState(14)
  const [darkTheme, setDarkTheme] = useState(true)
  const [lineNums,  setLineNums]  = useState(true)
  const [running,   setRunning]   = useState(false)
  const [submitting,setSubmitting]= useState(false)
  const [results,   setResults]   = useState<any[] | null>(null)
  const [consoleTab,setConsoleTab]= useState<'testcase'|'output'>('output')
  const [consoleOpen,setConsoleOpen] = useState(false)
  const [panelH,    setPanelH]    = useState(260)
  const [markedQ,   setMarkedQ]   = useState<Set<string>>(new Set())
  const [answeredQ, setAnsweredQ] = useState<Set<string>>(new Set())
  const [navOpen,   setNavOpen]   = useState(true)
  const dragY = useRef<{y:number;h:number}|null>(null)

  useEffect(() => { loadAttempt() }, [roundId])

  /* ── data loading ── */
  const loadAttempt = async () => {
    try {
      setLoading(true)
      const data = await attemptApi.start(roundId!)
      setAttempt(data.attempt)
      if (setAttemptId)    setAttemptId(data.attempt.id)
      if (setSessionId)    setSessionId(data.sessionId)
      if (setFaceDescriptor) setFaceDescriptor(data.faceDescriptor)
      setQuestions(data.questions)

      const init: Record<string, Record<string, string>> = {}
      const preSaved = new Set<string>()
      data.questions.forEach((q: any) => {
        init[q.id] = {}
        const sub = data.codingSubmissions?.[q.id]
        if (sub) {
          init[q.id][sub.language] = sub.sourceCode
          setLang(sub.language)
          preSaved.add(q.id)
        }
      })
      setCodes(init)
      setAnsweredQ(preSaved)
      setRoundTitle(data.attempt.roundType || 'Coding Assessment')
      setTimer(data.attempt.timeLimitMinutes * 60)
      setStrikes(data.attempt.strikeCount)
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start attempt')
      navigate('/candidate/lobby')
    } finally { setLoading(false) }
  }

  /* ── helpers ── */
  const codeFor = (qId: string, l: string) => codes[qId]?.[l] ?? LANG_DEFAULTS[l] ?? ''

  const changeLang = (l: string) => {
    setLang(l)
    setResults(null)
  }

  const handleEdit = (val: string | undefined) => {
    const qId = questions[currentIndex].id
    setCodes(p => ({ ...p, [qId]: { ...(p[qId] || {}), [lang]: val ?? '' } }))
  }

  const resetCode = () => {
    if (!window.confirm('Reset code to default? Your current progress will be lost.')) return
    const qId = questions[currentIndex].id
    setCodes(p => ({ ...p, [qId]: { ...(p[qId] || {}), [lang]: LANG_DEFAULTS[lang] } }))
    setResults(null)
  }

  /* ── run ── */
  const handleRun = async () => {
    setRunning(true)
    setResults(null)
    setConsoleOpen(true)
    setConsoleTab('output')
    const qId = questions[currentIndex].id
    try {
      const data = await attemptApi.runCoding({
        attemptId: attempt.id,
        questionId: qId,
        sourceCode: codeFor(qId, lang),
        language: lang,
      })
      setResults(data.results)
      setAnsweredQ(p => new Set([...p, qId]))
      const ok = data.passed === data.total
      ok ? toast.success('All test cases passed! 🎉') : toast.error(`${data.total - data.passed} test case(s) failed.`)
    } catch (err: any) {
      toast.error('Execution failed')
      setResults([{ passed: false, actualOutput: 'Error: ' + (err.response?.data?.message || err.message) }])
    } finally { setRunning(false) }
  }

  /* ── finish ── */
  const handleFinish = async () => {
    if (!window.confirm('Submit all coding problems and finish the attempt?')) return
    setSubmitting(true)
    try {
      await Promise.all(
        questions.map((q: any) =>
          attemptApi.submitCoding({
            attemptId: attempt.id,
            questionId: q.id,
            sourceCode: codeFor(q.id, lang),
            language: lang,
          }).catch(e => console.error(e))
        )
      )
      const res = await attemptApi.complete(attempt.id)
      if (res.advancement?.outcome === 'ADVANCED') {
        toast.success('Advancing to next round…')
        navigate(`/candidate/assessment/${res.advancement.nextRound.id}`)
      } else {
        toast.success('Assessment submitted!')
        navigate('/candidate/lobby')
      }
    } catch { toast.error('Failed to complete') }
    finally { setSubmitting(false) }
  }

  /* ── drag console ── */
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

  /* ── nav ── */
  const navigateTo = (idx: number) => {
    setCurrentIndex(idx)
    setResults(null)
  }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', flexDirection:'column', gap:16 }}>
      <div className="spinner" />
      <span style={{ color:'var(--text-muted)', fontSize:'0.9rem' }}>Loading assessment…</span>
    </div>
  )

  const q = questions[currentIndex]
  if (!q) return <div style={{ padding:32, color:'var(--cream)' }}>No tasks found.</div>

  const diffStyle = DIFF_STYLE[q.difficulty] || DIFF_STYLE['MEDIUM']
  const passedCount = results?.filter(r => r.passed).length ?? 0
  const isMarked    = markedQ.has(q.id)
  const isAnswered  = answeredQ.has(q.id)

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden', fontFamily:"'Inter','Segoe UI',sans-serif" }}>

      {/* ── Question meta bar ─────────────────────────────────── */}
      <div style={{
        display:'flex', alignItems:'center', gap:12, padding:'8px 20px',
        background:'var(--bg-elevated)', borderBottom:'1px solid var(--border)',
        flexShrink:0, flexWrap:'wrap',
      }}>
        <div style={{
          padding:'3px 12px', borderRadius:'20px', fontSize:'0.78rem', fontWeight:700,
          background:'rgba(99,102,241,0.15)', color:'#818cf8'
        }}>
          Question {currentIndex + 1}
        </div>
        <div style={{
          padding:'3px 10px', borderRadius:'20px', fontSize:'0.75rem', fontWeight:600,
          background: diffStyle.bg, color: diffStyle.color
        }}>
          {q.difficulty}
        </div>
        <div style={{
          padding:'3px 10px', borderRadius:'20px', fontSize:'0.75rem', fontWeight:500,
          background:'rgba(255,255,255,0.06)', color:'var(--text-muted)',
          display:'flex', alignItems:'center', gap:5
        }}>
          <Code2 size={11} /> coding
        </div>
        {isAnswered && (
          <div style={{
            padding:'3px 10px', borderRadius:'20px', fontSize:'0.75rem', fontWeight:600,
            background:'rgba(52,211,153,0.15)', color:'#34d399',
            display:'flex', alignItems:'center', gap:5
          }}>
            <CheckCircle2 size={11} /> Answered
          </div>
        )}
        {isMarked && (
          <div style={{
            padding:'3px 10px', borderRadius:'20px', fontSize:'0.75rem', fontWeight:600,
            background:'rgba(139,92,246,0.15)', color:'#a78bfa',
            display:'flex', alignItems:'center', gap:5
          }}>
            <BookmarkCheck size={11} /> Marked for Review
          </div>
        )}
      </div>

      {/* ── Main 3-column body ───────────────────────────────── */}
      <div style={{ flex:1, display:'grid', gridTemplateColumns:`1fr 1fr ${navOpen ? '220px' : '0px'}`, overflow:'hidden', transition:'grid-template-columns 0.2s' }}>

        {/* ── Problem Panel ── */}
        <div style={{ overflowY:'auto', borderRight:'1px solid var(--border)', background:'rgba(255,255,255,0.01)' }}>
          <div style={{ padding:'24px 28px' }}>
            <h2 style={{ fontSize:'1.25rem', fontWeight:700, color:'var(--cream)', marginBottom:14, lineHeight:1.3 }}>
              {q.problemTitle}
            </h2>
            <div style={{ color:'var(--text-secondary)', lineHeight:1.75, fontSize:'0.9rem', marginBottom:24 }}>
              {q.problemStatement}
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

            {q.examples && (q.examples as any[]).map((ex: any, i: number) => (
              <div key={i} style={{ marginBottom:16 }}>
                <h4 style={{ fontSize:'0.75rem', fontWeight:700, color:'var(--cream)', marginBottom:8, letterSpacing:'0.08em', textTransform:'uppercase' }}>
                  Example {i + 1}
                </h4>
                <div style={{ background:'var(--bg-elevated)', borderRadius:10, border:'1px solid var(--border)', overflow:'hidden' }}>
                  <div style={{ padding:'10px 16px 6px', display:'flex', gap:8, flexWrap:'wrap' }}>
                    <span style={{ color:'var(--text-muted)', fontSize:'0.82rem', minWidth:56 }}>Input:</span>
                    <code style={{ color:'var(--cream)', fontFamily:'monospace', fontSize:'0.82rem', wordBreak:'break-all' }}>{ex.input}</code>
                  </div>
                  <div style={{ padding:'6px 16px 10px', display:'flex', gap:8, flexWrap:'wrap' }}>
                    <span style={{ color:'var(--text-muted)', fontSize:'0.82rem', minWidth:56 }}>Output:</span>
                    <code style={{ color:'#fb8a1e', fontFamily:'monospace', fontSize:'0.82rem' }}>{ex.output}</code>
                  </div>
                  {ex.explanation && (
                    <div style={{ padding:'8px 16px', borderTop:'1px solid var(--border)', color:'var(--text-muted)', fontSize:'0.8rem', fontStyle:'italic' }}>
                      {ex.explanation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Editor + Console ── */}
        <div style={{ display:'flex', flexDirection:'column', overflow:'hidden', borderRight: navOpen ? '1px solid var(--border)' : 'none' }}>

          {/* Editor toolbar */}
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:6,
            padding:'8px 14px', background:'#1a1a2e', borderBottom:'1px solid var(--border)', flexShrink:0
          }}>
            {/* Left controls */}
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              {/* Language */}
              <select
                value={lang}
                onChange={e => changeLang(e.target.value)}
                style={{ background:'#0f0f23', color:'#e2e8f0', border:'1px solid #334155', borderRadius:6, padding:'4px 8px', fontSize:'0.82rem', cursor:'pointer', fontWeight:600 }}
              >
                {LANG_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              {/* Font size */}
              <select
                value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
                style={{ background:'#0f0f23', color:'#94a3b8', border:'1px solid #334155', borderRadius:6, padding:'4px 6px', fontSize:'0.78rem', cursor:'pointer' }}
              >
                {FONT_SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
              </select>

              {/* Theme toggle */}
              <button
                onClick={() => setDarkTheme(d => !d)}
                title={darkTheme ? 'Switch to Light' : 'Switch to Dark'}
                style={{ background:'#0f0f23', border:'1px solid #334155', borderRadius:6, padding:'4px 8px', cursor:'pointer', color:'#94a3b8', display:'flex', alignItems:'center' }}
              >
                {darkTheme ? <Sun size={13}/> : <Moon size={13}/>}
              </button>

              {/* Line numbers */}
              <button
                onClick={() => setLineNums(l => !l)}
                title="Toggle line numbers"
                style={{
                  background: lineNums ? 'rgba(99,102,241,0.2)' : '#0f0f23',
                  border:'1px solid ' + (lineNums ? '#6366f1' : '#334155'),
                  borderRadius:6, padding:'4px 8px', cursor:'pointer',
                  color: lineNums ? '#818cf8' : '#94a3b8', display:'flex', alignItems:'center', gap:4, fontSize:'0.75rem', fontWeight:600
                }}
              >
                <Type size={11}/> 1:1
              </button>

              {/* Reset */}
              <button
                onClick={resetCode}
                title="Reset to default"
                style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:6, padding:'4px 8px', cursor:'pointer', color:'#f87171', display:'flex', alignItems:'center', gap:4, fontSize:'0.75rem', fontWeight:600 }}
              >
                <RotateCcw size={11}/> Reset
              </button>
            </div>

            {/* Right: Run button */}
            <button
              onClick={handleRun}
              disabled={running}
              style={{
                display:'flex', alignItems:'center', gap:8, padding:'6px 18px',
                borderRadius:8, border:'none', cursor: running ? 'not-allowed' : 'pointer', fontWeight:700,
                fontSize:'0.85rem', background: running ? '#1e293b' : 'linear-gradient(135deg,#22c55e,#16a34a)',
                color: running ? '#64748b' : '#fff', transition:'all 0.2s', boxShadow: running ? 'none' : '0 0 16px rgba(34,197,94,0.3)'
              }}
            >
              {running
                ? <><div className="spinner spinner-sm" style={{ borderTopColor:'#64748b' }} /> Wait…</>
                : <><Play size={14} style={{ fill:'#fff' }}/> Compile &amp; Run</>}
            </button>
          </div>

          {/* Monaco Editor */}
          <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
            <Editor
              height="100%"
              language={lang === 'cpp' ? 'cpp' : lang}
              value={codeFor(q.id, lang)}
              onChange={handleEdit}
              theme={darkTheme ? 'vs-dark' : 'light'}
              options={{
                minimap: { enabled: false },
                fontSize,
                fontFamily: "'Cascadia Code','Fira Code','JetBrains Mono',monospace",
                fontLigatures: true,
                lineHeight: 1.65,
                padding: { top: 18, bottom: 18 },
                scrollBeyondLastLine: false,
                automaticLayout: true,
                renderLineHighlight: 'gutter',
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                lineNumbers: lineNums ? 'on' : 'off',
                bracketPairColorization: { enabled: true },
                guides: { bracketPairs: true },
                renderWhitespace: 'selection',
              }}
            />
          </div>

          {/* Drag handle */}
          <div
            onMouseDown={startDrag}
            style={{ height:5, background:'#1e293b', cursor:'row-resize', flexShrink:0, borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)' }}
          />

          {/* Console panel */}
          <div style={{
            height: consoleOpen ? panelH : 42, flexShrink:0,
            display:'flex', flexDirection:'column',
            background:'#0a0a14', transition:'height 0.2s ease', overflow:'hidden',
          }}>
            {/* Console header / tabs */}
            <div style={{ height:42, display:'flex', alignItems:'stretch', borderBottom:'1px solid #1e293b', flexShrink:0 }}>
              {/* Tab: Testcase */}
              <button
                onClick={() => { setConsoleTab('testcase'); setConsoleOpen(true) }}
                style={{
                  display:'flex', alignItems:'center', gap:6, padding:'0 16px', border:'none', cursor:'pointer', fontSize:'0.78rem', fontWeight:600,
                  background:'transparent', borderBottom: consoleOpen && consoleTab === 'testcase' ? '2px solid #6366f1' : '2px solid transparent',
                  color: consoleOpen && consoleTab === 'testcase' ? '#818cf8' : '#64748b',
                  transition:'color 0.15s'
                }}
              >
                <AlignLeft size={12}/> Testcase
              </button>

              {/* Tab: Output */}
              <button
                onClick={() => { setConsoleTab('output'); setConsoleOpen(true) }}
                style={{
                  display:'flex', alignItems:'center', gap:6, padding:'0 16px', border:'none', cursor:'pointer', fontSize:'0.78rem', fontWeight:600,
                  background:'transparent', borderBottom: consoleOpen && consoleTab === 'output' ? '2px solid #6366f1' : '2px solid transparent',
                  color: consoleOpen && consoleTab === 'output' ? '#818cf8' : '#64748b',
                  transition:'color 0.15s'
                }}
              >
                <Terminal size={12}/> Output
                {results && (
                  <span style={{
                    marginLeft:4, padding:'1px 7px', borderRadius:20, fontSize:'0.7rem',
                    fontWeight:700,
                    background: passedCount === results.length ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)',
                    color: passedCount === results.length ? '#34d399' : '#f87171',
                  }}>
                    {passedCount}/{results.length}
                  </span>
                )}
              </button>

              {/* Collapse toggle */}
              <button
                onClick={() => setConsoleOpen(o => !o)}
                style={{ marginLeft:'auto', padding:'0 14px', background:'transparent', border:'none', cursor:'pointer', color:'#475569' }}
              >
                {consoleOpen ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
              </button>
            </div>

            {/* Console body */}
            {consoleOpen && (
              <div style={{ flex:1, overflowY:'auto', padding:'14px 18px' }}>
                {/* Testcase tab: show raw input info */}
                {consoleTab === 'testcase' && (
                  <div>
                    <div style={{ fontSize:'0.78rem', color:'#64748b', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                      Sample Test Cases
                    </div>
                    {q.examples && (q.examples as any[]).slice(0, 3).map((ex: any, i: number) => (
                      <div key={i} style={{ marginBottom:10, background:'#0f172a', borderRadius:8, padding:'10px 14px', border:'1px solid #1e293b' }}>
                        <div style={{ fontSize:'0.75rem', color:'#64748b', marginBottom:6 }}>Testcase {i+1}</div>
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                          <span style={{ color:'#64748b', fontSize:'0.8rem', minWidth:56 }}>Input:</span>
                          <code style={{ color:'#e2e8f0', fontFamily:'monospace', fontSize:'0.82rem' }}>{ex.input}</code>
                        </div>
                      </div>
                    ))}
                    {!q.examples && <div style={{ color:'#64748b', fontSize:'0.85rem' }}>No sample test cases available.</div>}
                  </div>
                )}

                {/* Output tab */}
                {consoleTab === 'output' && (
                  <div>
                    {!results ? (
                      <div style={{ color:'#475569', fontSize:'0.85rem', fontFamily:'monospace' }}>
                        Click <strong style={{ color:'#22c55e' }}>Compile &amp; Run</strong> to see your output here.
                      </div>
                    ) : (
                      <>
                        {/* Summary bar */}
                        <div style={{
                          display:'flex', alignItems:'center', gap:16, padding:'10px 16px', borderRadius:8,
                          background: passedCount === results.length ? 'rgba(22,163,74,0.1)' : 'rgba(185,28,28,0.1)',
                          border: `1px solid ${passedCount === results.length ? 'rgba(22,163,74,0.3)' : 'rgba(185,28,28,0.3)'}`,
                          marginBottom:12,
                        }}>
                          {passedCount === results.length
                            ? <CheckCircle2 size={18} style={{ color:'#22c55e' }} />
                            : <XCircle      size={18} style={{ color:'#ef4444' }} />}
                          <div>
                            <div style={{ fontWeight:700, fontSize:'0.88rem', color: passedCount === results.length ? '#22c55e' : '#ef4444' }}>
                              {passedCount === results.length ? 'All Test Cases Passed' : 'Some Test Cases Failed'}
                            </div>
                            <div style={{ fontSize:'0.78rem', color:'#94a3b8' }}>
                              Test Cases Passed: {passedCount}/{results.length}
                            </div>
                          </div>
                        </div>

                        {/* Individual results */}
                        {results.map((res, i) => (
                          <div key={i} style={{ marginBottom:10, borderRadius:8, border:`1px solid ${res.passed ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`, overflow:'hidden' }}>
                            <div style={{
                              display:'flex', alignItems:'center', justifyContent:'space-between',
                              padding:'8px 14px', background: res.passed ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.08)'
                            }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                {res.passed
                                  ? <CheckCircle2 size={13} style={{ color:'#22c55e' }} />
                                  : <XCircle      size={13} style={{ color:'#ef4444' }} />}
                                <span style={{ fontSize:'0.8rem', fontWeight:700, color: res.passed ? '#22c55e' : '#ef4444' }}>
                                  Test Case {i + 1}
                                </span>
                              </div>
                              <span style={{
                                fontSize:'0.72rem', fontWeight:700, padding:'2px 10px', borderRadius:20,
                                background: res.passed ? 'rgba(22,163,74,0.2)' : 'rgba(185,28,28,0.25)',
                                color: res.passed ? '#4ade80' : '#fca5a5'
                              }}>
                                {res.passed ? '✓ Passed' : '✗ Failed'}
                              </span>
                            </div>
                            <div style={{ padding:'10px 14px', display:'grid', gridTemplateColumns:'90px 1fr', rowGap:6, columnGap:12, fontSize:'0.8rem' }}>
                              {res.input !== undefined && (
                                <>
                                  <span style={{ color:'#64748b' }}>Stdout:</span>
                                  <code style={{ color:'#cbd5e1', fontFamily:'monospace', wordBreak:'break-all' }}>{String(res.input) || '—'}</code>
                                </>
                              )}
                              <span style={{ color:'#64748b' }}>Expected:</span>
                              <code style={{ color:'#86efac', fontFamily:'monospace' }}>{res.expectedOutput ?? '—'}</code>
                              <span style={{ color:'#64748b' }}>Your Output:</span>
                              <code style={{ color: res.passed ? '#86efac' : '#fca5a5', fontFamily:'monospace', wordBreak:'break-all' }}>
                                {res.actualOutput || 'No output'}
                              </code>
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

          {/* Footer: prev / mark-review / next + save */}
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'10px 16px', background:'#1a1a2e', borderTop:'1px solid var(--border)', flexShrink:0
          }}>
            <button
              onClick={() => { navigateTo(currentIndex - 1) }}
              disabled={currentIndex === 0}
              style={{
                display:'flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:8,
                border:'1px solid #334155', background:'transparent', color: currentIndex === 0 ? '#334155' : '#94a3b8',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer', fontWeight:600, fontSize:'0.82rem'
              }}
            >
              <ChevronLeft size={15} /> Previous
            </button>

            <button
              onClick={() => {
                setMarkedQ(p => {
                  const n = new Set(p)
                  if (n.has(q.id)) n.delete(q.id); else n.add(q.id)
                  return n
                })
              }}
              style={{
                display:'flex', alignItems:'center', gap:6, padding:'7px 16px', borderRadius:8,
                border: isMarked ? '1px solid rgba(139,92,246,0.5)' : '1px solid #334155',
                background: isMarked ? 'rgba(139,92,246,0.1)' : 'transparent',
                color: isMarked ? '#a78bfa' : '#64748b', cursor:'pointer', fontWeight:600, fontSize:'0.82rem'
              }}
            >
              {isMarked ? <BookmarkCheck size={14}/> : <Bookmark size={14}/>}
              Mark for Review
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => navigateTo(currentIndex + 1)}
                style={{
                  display:'flex', alignItems:'center', gap:6, padding:'7px 18px', borderRadius:8,
                  border:'none', background:'linear-gradient(135deg,#6366f1,#4f46e5)', color:'#fff',
                  cursor:'pointer', fontWeight:700, fontSize:'0.82rem',
                  boxShadow:'0 0 14px rgba(99,102,241,0.4)'
                }}
              >
                Save &amp; Next <ChevronRight size={15}/>
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={submitting}
                style={{
                  display:'flex', alignItems:'center', gap:6, padding:'7px 18px', borderRadius:8,
                  border:'none', background: submitting ? '#1e293b' : 'linear-gradient(135deg,#f59e0b,#d97706)',
                  color: submitting ? '#64748b' : '#fff', cursor: submitting ? 'not-allowed' : 'pointer',
                  fontWeight:700, fontSize:'0.82rem', boxShadow: submitting ? 'none' : '0 0 14px rgba(245,158,11,0.4)'
                }}
              >
                <Send size={14}/> {submitting ? 'Submitting…' : 'Finish Attempt'}
              </button>
            )}
          </div>
        </div>

        {/* ── Right: Nav Sidebar ─────────────────────────────── */}
        {navOpen && (
          <div style={{ overflowY:'auto', background:'#0f0f1a', padding:'20px 16px', display:'flex', flexDirection:'column', gap:20 }}>
            {/* Nav toggle */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:'0.78rem', fontWeight:700, color:'#64748b', letterSpacing:'0.08em', textTransform:'uppercase' }}>
                Question Navigation
              </span>
              <button onClick={() => setNavOpen(false)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#475569', padding:2 }}>
                <ChevronRight size={14}/>
              </button>
            </div>

            {/* Grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8 }}>
              {questions.map((_: any, i: number) => {
                const qid = questions[i].id
                const isCurrent  = i === currentIndex
                const isAns      = answeredQ.has(qid)
                const isMark     = markedQ.has(qid)
                return (
                  <button
                    key={i}
                    onClick={() => navigateTo(i)}
                    style={{
                      padding:'8px 0', borderRadius:8, border:'2px solid',
                      fontWeight:700, fontSize:'0.85rem', cursor:'pointer', transition:'all 0.15s',
                      borderColor: isCurrent ? '#6366f1' : isMark ? '#8b5cf6' : isAns ? '#22c55e' : '#1e293b',
                      background: isCurrent ? '#6366f1' : isMark ? 'rgba(139,92,246,0.15)' : isAns ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                      color: isCurrent ? '#fff' : isMark ? '#a78bfa' : isAns ? '#4ade80' : '#94a3b8',
                    }}
                  >
                    {i + 1}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div style={{ borderTop:'1px solid #1e293b', paddingTop:16 }}>
              <div style={{ fontSize:'0.78rem', fontWeight:700, color:'#64748b', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:12 }}>
                Question Status
              </div>
              {[
                { color:'#22c55e', bg:'rgba(34,197,94,0.12)', label:'Answered',        count: answeredQ.size },
                { color:'#94a3b8', bg:'rgba(148,163,184,0.08)', label:'Unanswered',    count: questions.length - answeredQ.size - markedQ.size },
                { color:'#a78bfa', bg:'rgba(139,92,246,0.12)', label:'Mark for Review',count: markedQ.size },
              ].map(item => (
                <div key={item.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:14, height:14, borderRadius:4, background:item.bg, border:`2px solid ${item.color}` }} />
                    <span style={{ fontSize:'0.8rem', color:'#94a3b8' }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize:'0.8rem', fontWeight:700, color:'#64748b' }}>{Math.max(0, item.count)}</span>
                </div>
              ))}
            </div>

            {/* Finish button */}
            <button
              onClick={handleFinish}
              disabled={submitting}
              style={{
                padding:'10px', borderRadius:10, border:'none', fontWeight:700, fontSize:'0.85rem', cursor:'pointer',
                background: submitting ? '#1e293b' : 'linear-gradient(135deg,#f59e0b,#d97706)',
                color: submitting ? '#475569' : '#fff', marginTop:'auto',
                boxShadow: submitting ? 'none' : '0 4px 16px rgba(245,158,11,0.3)'
              }}
            >
              {submitting ? 'Submitting…' : '⚡ Submit Test'}
            </button>
          </div>
        )}

        {/* Collapsed nav toggle */}
        {!navOpen && (
          <button
            onClick={() => setNavOpen(true)}
            style={{
              position:'absolute', right:0, top:'50%', transform:'translateY(-50%)',
              background:'#1e293b', border:'1px solid var(--border)', borderRight:'none',
              borderRadius:'8px 0 0 8px', padding:'12px 4px', cursor:'pointer', color:'#64748b', zIndex:10
            }}
          >
            <ChevronLeft size={14}/>
          </button>
        )}
       </div>
    </div>
  )
}