import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { attemptApi } from '../../services/api.services'
import { MessageSquare, Volume2, VolumeX, ChevronRight, Send, Square, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

const MAX_RECORD_SECONDS  = 180
const WARN_RECORD_SECONDS = 150
const MIN_ANSWER_SECONDS  = 15
const FILLER_WORDS = ['um','uh','like','you know','basically','literally','actually','so','right','okay','er','hmm']

function speakText(text: string, onEnd?: () => void) {
  if (!window.speechSynthesis) { onEnd?.(); return }
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.92; utt.pitch = 1.0; utt.volume = 1.0; utt.lang = 'en-US'
  if (onEnd) utt.onend = onEnd
  const preferred = window.speechSynthesis.getVoices().find(v => /Google|Natural|Neural|Samantha/i.test(v.name))
  if (preferred) utt.voice = preferred
  window.speechSynthesis.speak(utt)
}

function stopSpeaking() { window.speechSynthesis?.cancel() }

export default function InterviewRound() {
  const { roundId } = useParams()
  const navigate = useNavigate()
  const { setAttemptId, setStrikes, setTimer, setRoundTitle, setSessionId, setFaceDescriptor } = useOutletContext<any>()

  const [loading, setLoading]             = useState(true)
  const [attempt, setAttempt]             = useState<any>(null)
  const [questions, setQuestions]         = useState<any[]>([])
  const [currentIndex, setCurrentIndex]   = useState(0)
  const [answers, setAnswers]             = useState<Record<string, string>>({})
  const [submitting, setSubmitting]       = useState(false)
  const [interviewMode, setInterviewMode] = useState<'TEXT' | 'AUDIO'>('TEXT')
  const [isSpeaking, setIsSpeaking]       = useState(false)
  const [isRecording, setIsRecording]     = useState(false)
  const [audioBlob, setAudioBlob]         = useState<Blob | null>(null)
  const [audioDuration, setAudioDuration] = useState(0)
  const [showTimeWarn, setShowTimeWarn]   = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoStopRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ttsTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamRef        = useRef<MediaStream | null>(null)

  useEffect(() => {
    startAttempt()
    return () => { stopSpeaking(); stopRecording(); clearTimers() }
  }, [roundId])

  // Auto-dictate + auto-start recording when question changes
  useEffect(() => {
    if (loading || questions.length === 0) return
    const q = questions[currentIndex]
    if (!q?.prompt) return
    clearTimers()
    setAudioBlob(null); setAudioDuration(0); setShowTimeWarn(false); setIsSpeaking(true)

    const onTTSEnd = () => {
      setIsSpeaking(false)
      if (interviewMode === 'AUDIO') {
        ttsTimerRef.current = setTimeout(() => startRecording(), 800)
      }
    }

    speakText(q.prompt, onTTSEnd)

    // Fallback: force-start if onend doesn't fire
    if (interviewMode === 'AUDIO') {
      const fallbackMs = (q.prompt.length / 12) * 1000 + 4000
      ttsTimerRef.current = setTimeout(() => {
        stopSpeaking(); setIsSpeaking(false); startRecording()
      }, fallbackMs)
    }
  }, [currentIndex, loading, questions, interviewMode])

  function clearTimers() {
    if (ttsTimerRef.current)   clearTimeout(ttsTimerRef.current)
    if (autoStopRef.current)   clearTimeout(autoStopRef.current)
    if (durationTimerRef.current) clearInterval(durationTimerRef.current)
  }

  const startAttempt = async () => {
    try {
      setLoading(true)
      const data = await attemptApi.start(roundId!)
      setAttempt(data.attempt)
      if (setAttemptId)      setAttemptId(data.attempt.id)
      if (setSessionId)      setSessionId(data.sessionId)
      if (setFaceDescriptor) setFaceDescriptor(data.faceDescriptor)
      setQuestions(data.questions)
      setRoundTitle('AI Interview')
      setTimer(data.attempt.timeLimitMinutes * 60)
      setStrikes(data.attempt.strikeCount)
      setInterviewMode(data.interviewMode || 'TEXT')
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start attempt')
      navigate('/candidate/lobby')
    } finally { setLoading(false) }
  }

  const handleReplay = () => {
    if (isRecording) stopRecording()
    setAudioBlob(null); clearTimers(); setIsSpeaking(true)
    const q = questions[currentIndex]
    speakText(q.prompt, () => {
      setIsSpeaking(false)
      if (interviewMode === 'AUDIO') ttsTimerRef.current = setTimeout(() => startRecording(), 800)
    })
  }

  const handleStopTTS = () => {
    clearTimers(); stopSpeaking(); setIsSpeaking(false)
    if (interviewMode === 'AUDIO') ttsTimerRef.current = setTimeout(() => startRecording(), 400)
  }

  const startRecording = async () => {
    if (isRecording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = recorder
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        setAudioBlob(new Blob(chunksRef.current, { type: 'audio/webm' }))
        stream.getTracks().forEach(t => t.stop())
      }
      recorder.start(250)
      setIsRecording(true); setAudioDuration(0); setShowTimeWarn(false)
      durationTimerRef.current = setInterval(() => {
        setAudioDuration(d => { if (d + 1 >= WARN_RECORD_SECONDS) setShowTimeWarn(true); return d + 1 })
      }, 1000)
      autoStopRef.current = setTimeout(() => {
        toast('Max recording time reached — stopping.', { icon: '⏱' }); stopRecording()
      }, MAX_RECORD_SECONDS * 1000)
    } catch {
      toast.error('Microphone access denied. Please allow mic access.')
    }
  }

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (durationTimerRef.current) clearInterval(durationTimerRef.current)
    if (autoStopRef.current) clearTimeout(autoStopRef.current)
    setIsRecording(false); setShowTimeWarn(false)
  }, [])

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // Compute delivery metrics from transcript + duration
  function computeDeliveryMetrics(transcript: string, durationSecs: number) {
    const words          = transcript.trim().split(/\s+/).filter(Boolean)
    const wordCount      = words.length
    const fillerWordCount = words.filter(w => FILLER_WORDS.includes(w.toLowerCase().replace(/[^a-z]/g, ''))).length
    const fillerWordRatio = wordCount > 0 ? fillerWordCount / wordCount : 0
    const speechDuration  = Math.min(wordCount * 0.4, durationSecs)
    const silenceRatio    = durationSecs > 0 ? Math.max(0, 1 - speechDuration / durationSecs) : 0
    const wordsPerMinute  = speechDuration > 0 ? (wordCount / speechDuration) * 60 : 0

    let score = 10
    if (wordsPerMinute < 60)   score -= 2.5
    else if (wordsPerMinute < 100) score -= 1
    else if (wordsPerMinute > 200) score -= 2
    else if (wordsPerMinute > 180) score -= 1
    if (silenceRatio > 0.6)    score -= 2.5
    else if (silenceRatio > 0.4) score -= 1
    if (fillerWordRatio > 0.15) score -= 2
    else if (fillerWordRatio > 0.08) score -= 1
    if (durationSecs < MIN_ANSWER_SECONDS) score -= 3

    return {
      durationSeconds: durationSecs,
      speechDuration,
      silenceRatio,
      wordsPerMinute,
      wordCount,
      fillerWordCount,
      fillerWordRatio,
      deliveryScore: Math.max(0, Math.min(10, score)),
    }
  }

  const handleNext = async () => {
    const qId = questions[currentIndex].id
    if (interviewMode === 'TEXT') {
      if (!answers[qId]?.trim()) { toast.error('Please type your answer.'); return }
      if (answers[qId].trim().split(/\s+/).length < 10) { toast.error('Min 10 words required.'); return }
    }
    if (interviewMode === 'AUDIO') {
      if (isRecording) stopRecording()
      if (!audioBlob) { toast.error('Please record your answer.'); return }
    }

    stopSpeaking(); setSubmitting(true)

    try {
      if (interviewMode === 'TEXT') {
        await attemptApi.submitInterview({ attemptId: attempt.id, questionId: qId, mode: 'TEXT', textAnswer: answers[qId], timeTakenSeconds: 0 })
      } else {
        const fd = new FormData()
        fd.append('attemptId', attempt.id)
        fd.append('questionId', qId)
        fd.append('mode', 'AUDIO')
        fd.append('timeTakenSeconds', String(audioDuration))
        fd.append('durationSeconds', String(audioDuration))
        fd.append('audio', audioBlob!, `answer-${qId}.webm`)
        await attemptApi.submitInterviewAudio(fd)
      }

      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        await handleFinish()
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit. Try again.')
    } finally { setSubmitting(false) }
  }

  const handleFinish = async () => {
    try {
      const res = await attemptApi.complete(attempt.id)
      const outcome = res.advancement?.outcome
      if (outcome === 'ADVANCED')           navigate('/candidate/lobby',      { state: { advancement: res.advancement } })
      else if (outcome === 'ALL_ROUNDS_COMPLETE') navigate('/candidate/complete')
      else if (outcome === 'REJECTED')      navigate('/candidate/terminated', { state: { reason: res.advancement?.reason, type: 'failed' } })
      else if (outcome === 'FLAGGED')       navigate('/candidate/complete',   { state: { pendingReview: true } })
      else                                  navigate('/candidate/lobby')
    } catch (err: any) { toast.error(err.response?.data?.message || 'Failed to finish.') }
  }

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', gap:12 }}>
        <div className="spinner" />
        <span style={{ color:'var(--text-secondary)', fontSize:'0.875rem' }}>Preparing interview...</span>
      </div>
    )
  }

  const q = questions[currentIndex]
  if (!q) return <div style={{ padding:40, color:'var(--text-secondary)' }}>No questions available.</div>

  const isLast    = currentIndex === questions.length - 1
  const canSubmit = interviewMode === 'TEXT'
    ? (answers[q.id] || '').trim().split(/\s+/).length >= 10
    : !!audioBlob && !isRecording
  const isNearLimit = audioDuration >= WARN_RECORD_SECONDS

  return (
    <div style={{ maxWidth:680, margin:'0 auto', padding:'32px 20px', width:'100%', display:'flex', flexDirection:'column', gap:24 }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ width:56, height:56, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg, var(--orange), var(--red))', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 20px var(--orange-glow)' }}>
          <MessageSquare size={26} color="white" />
        </div>
        <div>
          <h2 style={{ color:'var(--text-primary)', fontSize:'1.3rem', marginBottom:2 }}>AI Interview</h2>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ color:'var(--text-secondary)', fontSize:'0.85rem' }}>Question {currentIndex + 1} of {questions.length}</span>
            <span className={`badge ${interviewMode === 'AUDIO' ? 'badge-teal' : 'badge-primary'}`} style={{ fontSize:'0.6rem' }}>{interviewMode} MODE</span>
          </div>
        </div>
      </div>

      {/* Question card */}
      <div className="card" style={{ background:'var(--bg-elevated)', padding:'28px 28px 22px', position:'relative', border:'1px solid var(--border)' }}>
        <div style={{ position:'absolute', top:-10, left:20, background:'var(--orange)', color:'white', fontSize:'0.65rem', fontWeight:700, padding:'2px 10px', borderRadius:4 }}>AI INTERVIEWER</div>
        <p style={{ color:'var(--text-primary)', fontSize:'1.15rem', lineHeight:1.65, fontWeight:500, marginBottom:18 }}>{q.prompt}</p>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {isSpeaking ? (
            <>
              <button className="btn btn-sm btn-ghost" onClick={handleStopTTS} style={{ gap:6, fontSize:'0.8rem' }}>
                <VolumeX size={14} /> Skip & Start Recording
              </button>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div className="pulse" style={{ width:7, height:7, borderRadius:'50%', background:'var(--orange)' }} />
                <span style={{ fontSize:'0.78rem', color:'var(--orange)' }}>Reading question...</span>
              </div>
            </>
          ) : (
            <button className="btn btn-sm btn-ghost" onClick={handleReplay} style={{ gap:6, fontSize:'0.8rem' }}>
              <Volume2 size={14} /> Replay Question
            </button>
          )}
        </div>
      </div>

      {/* TEXT MODE */}
      {interviewMode === 'TEXT' && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <textarea
            value={answers[q.id] || ''}
            onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
            placeholder="Type your answer here..."
            className="form-textarea"
            style={{ minHeight:180, fontSize:'1rem', lineHeight:1.65, background:'var(--bg-card)', color:'var(--text-primary)' }}
          />
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.78rem', color:'var(--text-muted)' }}>
            <span>
              {(answers[q.id] || '').trim().split(/\s+/).filter(Boolean).length} words{' '}
              <span style={{ color: (answers[q.id] || '').trim().split(/\s+/).filter(Boolean).length < 10 ? 'var(--red)' : 'var(--green-dark)' }}>
                {(answers[q.id] || '').trim().split(/\s+/).filter(Boolean).length < 10 ? '(min 10 words)' : '✓'}
              </span>
            </span>
            <span>Be specific and detailed</span>
          </div>
        </div>
      )}

      {/* AUDIO MODE */}
      {interviewMode === 'AUDIO' && (
        <div style={{ background:'var(--bg-elevated)', borderRadius:14, border:`1px solid ${isRecording ? 'rgba(251,55,30,0.4)' : 'var(--border)'}`, padding:'28px 24px', display:'flex', flexDirection:'column', alignItems:'center', gap:18, textAlign:'center', transition:'border-color 0.3s' }}>

          {isSpeaking && <p style={{ color:'var(--text-secondary)', fontSize:'0.9rem' }}>🔊 Listen carefully — recording starts automatically when the question finishes.</p>}

          {isRecording && !showTimeWarn && <p style={{ color:'var(--red)', fontSize:'0.9rem', fontWeight:600 }}>🔴 Recording in progress — speak clearly and naturally.</p>}

          {isRecording && showTimeWarn && (
            <div style={{ background:'var(--orange-soft)', border:'1px solid var(--orange)', borderRadius:8, padding:'10px 16px', display:'flex', alignItems:'center', gap:8, color:'var(--orange)', fontSize:'0.85rem', fontWeight:600 }}>
              <AlertTriangle size={16} />
              {MAX_RECORD_SECONDS - audioDuration} seconds left — start wrapping up
            </div>
          )}

          {audioBlob && !isRecording && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
              <p style={{ color:'var(--green-dark)', fontSize:'0.9rem' }}>✓ Answer recorded ({formatDuration(audioDuration)})</p>
              <button className="btn btn-ghost btn-sm" onClick={handleReplay} style={{ fontSize:'0.8rem', gap:6 }}>↺ Re-record</button>
            </div>
          )}

          {/* Recording UI */}
          {isRecording && (
            <>
              <div style={{ position:'relative', width:80, height:80, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'3px solid var(--red)', opacity:0.4, animation:'pulse 1s ease infinite' }} />
                <div style={{ width:60, height:60, borderRadius:'50%', background:'var(--red)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 20px var(--red-glow)' }}>
                  <Square size={22} color="white" />
                </div>
              </div>
              <span style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'1.4rem', fontWeight:700, color: isNearLimit ? 'var(--orange)' : 'var(--red)' }}>
                {formatDuration(audioDuration)}
                <span style={{ fontSize:'0.7rem', fontWeight:400, color:'var(--text-muted)', marginLeft:8 }}>/ {formatDuration(MAX_RECORD_SECONDS)}</span>
              </span>
              <div style={{ display:'flex', alignItems:'center', gap:3, height:28 }}>
                {Array.from({ length: 18 }).map((_, i) => (
                  <div key={i} style={{ width:3, borderRadius:3, background: isNearLimit ? 'var(--orange)' : 'var(--red)', height:`${10 + Math.sin(i * 0.8) * 8}px`, animation:`pulse ${0.35 + i * 0.07}s ease infinite` }} />
                ))}
              </div>
              <button className="btn btn-outline btn-sm" onClick={stopRecording} style={{ gap:6 }}>
                <Square size={13} /> Stop Recording
              </button>
            </>
          )}
        </div>
      )}

      {/* Navigation */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderTop:'1px solid var(--border)', paddingTop:20 }}>
        <div style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>
          {interviewMode === 'AUDIO' ? 'Recording starts automatically after the question is read' : 'Use specific examples from your experience'}
        </div>
        <button className="btn btn-primary" onClick={handleNext} disabled={submitting || !canSubmit || isSpeaking} style={{ minWidth:160, gap:8 }}>
          {submitting
            ? <><div className="spinner spinner-sm" /> Processing...</>
            : isLast ? <><Send size={16} /> Finish Interview</> : <>Next Question <ChevronRight size={16} /></>
          }
        </button>
      </div>
    </div>
  )
}