import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { attemptApi } from '../../services/api.services'
import { MessageSquare, Volume2, VolumeX, ChevronRight, Send, Square, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

const MAX_RECORD_SECONDS  = 180
const WARN_RECORD_SECONDS = 150

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
  const [activeFollowUp, setActiveFollowUp] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef         = useRef<Blob[]>([])
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoStopRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ttsTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const streamRef        = useRef<MediaStream | null>(null)

  useEffect(() => {
    startAttempt()
    return () => { stopSpeaking(); stopRecording(); clearTimers() }
  }, [roundId])

  useEffect(() => {
    if (loading || questions.length === 0) return
    const q = questions[currentIndex]
    const textToPrompt = activeFollowUp || q?.prompt
    if (!textToPrompt) return

    clearTimers()
    setAudioBlob(null); setAudioDuration(0); setShowTimeWarn(false); setIsSpeaking(true)

    const onTTSEnd = () => {
      setIsSpeaking(false)
      if (interviewMode === 'AUDIO') {
        ttsTimerRef.current = setTimeout(() => startRecording(), 800)
      }
    }
    speakText(textToPrompt, onTTSEnd)
  }, [currentIndex, loading, questions, interviewMode, activeFollowUp])

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
      if (setAttemptId) setAttemptId(data.attempt.id)
      if (setSessionId) setSessionId(data.sessionId)
      if (setFaceDescriptor) setFaceDescriptor(data.faceDescriptor)
      setQuestions(data.questions)
      setRoundTitle('AI Interview')
      setTimer(data.attempt.timeLimitMinutes * 60)
      setStrikes(data.attempt.strikeCount)
      setInterviewMode(data.interviewMode || 'TEXT')
    } catch (err: any) {
      toast.error('Failed to start attempt')
      navigate('/candidate/lobby')
    } finally { setLoading(false) }
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
        setAudioDuration(d => {
          const next = d + 1
          if (next >= MAX_RECORD_SECONDS) {
            stopRecording()
            toast.error("Maximum recording time reached")
          }
          if (next >= WARN_RECORD_SECONDS) setShowTimeWarn(true)
          return next
        })
      }, 1000)
    } catch { toast.error('Microphone access denied.') }
  }

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      clearTimers()
      setIsRecording(false); setShowTimeWarn(false)
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        streamRef.current?.getTracks().forEach(t => t.stop())
        resolve(null); return
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        streamRef.current?.getTracks().forEach(t => t.stop())
        setAudioBlob(blob); resolve(blob)
      }
      recorder.stop()
    })
  }, [])

  const handleNext = async () => {
    const qId = questions[currentIndex].id
    stopSpeaking(); setSubmitting(true)

    try {
      let res;
      if (interviewMode === 'TEXT') {
        res = await attemptApi.submitInterview({ 
          attemptId: attempt.id, 
          questionId: qId, 
          mode: 'TEXT', 
          textAnswer: answers[qId] || "",
          timeTakenSeconds: 0 
        })
      } else {
        let blobToSend = isRecording ? await stopRecording() : audioBlob
        if (!blobToSend) throw new Error("No audio captured")
        const fd = new FormData()
        fd.append('attemptId', attempt.id)
        fd.append('questionId', qId)
        fd.append('mode', 'AUDIO')
        fd.append('audio', blobToSend, `answer-${qId}.webm`)
        fd.append('timeTakenSeconds', String(audioDuration))
        res = await attemptApi.submitInterviewAudio(fd)
      }

      if (res.followUp && !activeFollowUp) {
        toast("Follow-up question coming up...", { icon: '💬' })
        setActiveFollowUp(res.followUp)
        setAnswers({ ...answers, [qId]: "" })
        setAudioBlob(null)
        setSubmitting(false)
        return
      }

      setActiveFollowUp(null)
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1)
      } else {
        const finishRes = await attemptApi.complete(attempt.id)
        navigate('/candidate/lobby', { state: { advancement: finishRes.advancement } })
      }
    } catch (err: any) {
      toast.error('Submission failed.')
    } finally { setSubmitting(false) }
  }

  const q = questions[currentIndex]
  if (loading || !q) return <div className="p-10 text-center">Loading...</div>

  return (
    <div style={{ maxWidth:680, margin:'0 auto', padding:'32px 20px', width:'100%', display:'flex', flexDirection:'column', gap:24 }}>
      <div style={{ display:'flex', alignItems:'center', gap:16 }}>
        <div style={{ width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg, var(--orange), var(--red))', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <MessageSquare size={26} color="white" />
        </div>
        <div>
          <h2 style={{ color:'var(--text-primary)', fontSize:'1.3rem' }}>AI Interview</h2>
          <span style={{ color:'var(--text-secondary)', fontSize:'0.85rem' }}>
            Question {currentIndex + 1} of {questions.length} {activeFollowUp && "(Follow-up)"}
          </span>
        </div>
      </div>

      <div className="card" style={{ background:'var(--bg-elevated)', padding:'28px', border:'1px solid var(--border)', position:'relative' }}>
        <div style={{ position:'absolute', top:-10, left:20, background:'var(--orange)', color:'white', fontSize:'0.65rem', fontWeight:700, padding:'2px 10px', borderRadius:4 }}>
          {activeFollowUp ? 'FOLLOW-UP' : 'AI INTERVIEWER'}
        </div>
        <p style={{ color:'var(--text-primary)', fontSize:'1.15rem', lineHeight:1.6 }}>
          {activeFollowUp || q.prompt}
        </p>
        <div style={{ marginTop: 15, display: 'flex', gap: 10 }}>
            {isSpeaking ? (
                <button className="btn-link" onClick={() => { stopSpeaking(); setIsSpeaking(false); if(interviewMode==='AUDIO') startRecording(); }} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--orange)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <VolumeX size={14} /> Skip Reading
                </button>
            ) : (
                <button className="btn-link" onClick={() => speakText(activeFollowUp || q.prompt)} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    <Volume2 size={14} /> Replay
                </button>
            )}
        </div>
      </div>

      {interviewMode === 'TEXT' ? (
        <textarea
          value={answers[q.id] || ''}
          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
          className="form-textarea"
          placeholder="Type your answer..."
          style={{ minHeight:180, width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            {isRecording ? (
                <>
                    <div style={{ color: 'var(--red)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.2rem' }}>
                        <Square size={20} fill="var(--red)" /> {Math.floor(audioDuration / 60)}:{(audioDuration % 60).toString().padStart(2, '0')}
                    </div>
                    {showTimeWarn && <div style={{ color: 'var(--orange)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 5 }}><AlertTriangle size={16}/> Wrapping up soon...</div>}
                    <button onClick={() => stopRecording()} className="btn btn-outline" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>Stop Recording</button>
                </>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {audioBlob ? (
                      <span style={{ color: 'var(--green)', fontWeight: 600 }}>✓ Answer Captured</span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>Microphone ready. Recording starts automatically.</span>
                    )}
                </div>
            )}
        </div>
      )}

      <div style={{ display:'flex', justifyContent:'flex-end', paddingTop:20 }}>
        <button className="btn btn-primary" onClick={handleNext} disabled={submitting || isSpeaking} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px' }}>
          {submitting ? 'Processing...' : (currentIndex === questions.length - 1 && !activeFollowUp ? <><Send size={18}/> Finish Interview</> : <><ChevronRight size={18}/> Next Question</>)}
        </button>
      </div>
    </div>
  )
}