import { useRef, useEffect, useState } from 'react'
import { UserCheck, Wifi, Mic, Activity, AlertOctagon } from 'lucide-react'
import { useProctoring } from '../hooks/useProctoring'
import { enrollFace } from '../utils/detectionService'
import axios from 'axios'
import toast from 'react-hot-toast'

interface ProctoringCameraProps {
  candidateId:          string
  attemptId?:           string
  sessionId:            string
  referenceDescriptor:  number[] | null
  maxStrikes?:          number
  rules?:               Record<string, boolean>
  onEnrollComplete?:    (descriptor: number[], photo: string) => void
  onViolation?:         (type: string) => void
  onStrikesChange?:     (strikes: number) => void
  onTerminate?:         () => void
  onReportViolation?:   (reportFn: (type: string, isStrike: boolean) => void) => void
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'

export function ProctoringCamera({
  candidateId,
  attemptId = '',
  sessionId,
  referenceDescriptor,
  maxStrikes = 3,
  rules = {},
  onEnrollComplete,
  onStrikesChange,
  onTerminate,
  onReportViolation,
}: ProctoringCameraProps) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [enrolling, setEnrolling] = useState(false)
  const [enrolled,  setEnrolled]  = useState(!!referenceDescriptor)
  const [networkSpeed, setNetworkSpeed] = useState('Detecting...')
  const [audioDetected, setAudioDetected] = useState(false)

  const { loading, strikes, violations, status, realTimeState, reportViolation } = useProctoring(
    videoRef, canvasRef, candidateId, sessionId, referenceDescriptor, maxStrikes, rules, attemptId
  )

  useEffect(() => {
    if (onReportViolation) onReportViolation(reportViolation)
  }, [reportViolation, onReportViolation])

  useEffect(() => {
    if (referenceDescriptor) setEnrolled(true)
  }, [referenceDescriptor])

  useEffect(() => {
    startVideo()
    const conn = (navigator as any).connection
    if (conn) {
      const updateNet = () => setNetworkSpeed(`${conn.downlink || 0} Mbps`)
      updateNet(); conn.addEventListener('change', updateNet)
      return () => { conn.removeEventListener('change', updateNet); streamRef.current?.getTracks().forEach(t => t.stop()) }
    }
    return () => streamRef.current?.getTracks().forEach(t => t.stop())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (status === 'TERMINATED' && onTerminate) onTerminate() }, [status, onTerminate])
  useEffect(() => { if (onStrikesChange) onStrikesChange(strikes) }, [strikes, onStrikesChange])

  const startVideo = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = s
      if (videoRef.current) videoRef.current.srcObject = s
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const analyser = audioCtx.createAnalyser()
      const source = audioCtx.createMediaStreamSource(s)
      source.connect(analyser)
      analyser.fftSize = 256
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateAudio = () => {
        if (!streamRef.current) return
        analyser.getByteFrequencyData(dataArray)
        let sum = 0; for(let i=0; i<dataArray.length; i++) sum += dataArray[i]
        setAudioDetected((sum / dataArray.length) > 25)
        requestAnimationFrame(updateAudio)
      }
      updateAudio()
    } catch { 
      // Silently fail if camera is busy, retry logic handled by hooks
    }
  }

  const handleEnroll = async () => {
    if (!videoRef.current || enrolling) return
    setEnrolling(true)
    try {
      const result = await enrollFace(videoRef.current)
      if (!result) { toast.error('Face not detected.'); return }

      const descriptorArray = Array.from(result.descriptor) as number[]
      await axios.post(`${API_BASE}/proctoring/enroll`, { candidateId, descriptor: descriptorArray, photo: result.photo }, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } })

      setEnrolled(true)
      if (onEnrollComplete) onEnrollComplete(descriptorArray, result.photo)
      toast.success('Identity verified!')
    } catch (err: any) { toast.error('Enrollment failed.') } finally { setEnrolling(false) }
  }

  return (
    <div style={{ position: 'relative', width: '280px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      
      {/* ── Video Container ── */}
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '16px', background: '#000', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', border: '1px solid var(--border)' }}>
        <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: 'auto', display: 'block', transform: 'scaleX(-1)' }} />
        <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', transform: 'scaleX(-1)' }} />

        {/* Real-time Warning Overlay */}
        {(realTimeState.noFaceDetected || realTimeState.phoneDetected || realTimeState.multiplePeople) && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(239,68,68,0.9)', padding: '6px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#fff' }}>
            {realTimeState.phoneDetected ? '📱 PHONE DETECTED' : realTimeState.multiplePeople ? '👤 MULTIPLE PEOPLE' : '❌ NO FACE DETECTED'}
          </div>
        )}

        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <div className="spinner" style={{ width: '24px', height: '24px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.65rem', color: '#fff', opacity: 0.7 }}>Starting Sentinels...</span>
          </div>
        )}

        {status === 'TERMINATED' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: '20px', textAlign: 'center' }}>
            <AlertOctagon size={40} />
            <div style={{ fontWeight: 900, fontSize: '1.2rem', marginTop: '10px' }}>TERMINATED</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>Strike limit exceeded.</div>
          </div>
        )}
      </div>

      {/* ── Verification & Stats Panel ── */}
      <div className="glass-card" style={{ padding: '12px', background: 'rgba(20,20,25,0.8)', backdropFilter: 'blur(10px)', border: '1px solid var(--border)', borderRadius: '12px' }}>
        
        {/* Verification Status */}
        {!enrolled ? (
          <button className="btn btn-sm btn-orange" onClick={handleEnroll} disabled={loading || enrolling} style={{ width: '100%', borderRadius: '8px' }}>
             {enrolling ? 'Extracting biometric...' : 'Verify Candidate Identity'}
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--green)', fontSize: '0.75rem', fontWeight: 600, padding: '4px 0' }}>
            <UserCheck size={16} />
            <span>Identity Verified</span>
          </div>
        )}

        {/* Micro Stats Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
             <Wifi size={12} color="var(--blue)" /> {networkSpeed}
           </div>
           <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
             {audioDetected ? <Mic size={12} color="var(--orange)" /> : <Activity size={12} color="var(--text-muted)" />}
             {audioDetected ? 'Ambient Noise' : 'Quiet'}
           </div>
        </div>

        {/* History Feed (Compact) */}
        {violations.length > 0 && (
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Event Log</div>
            {violations.slice(0, 2).map((v: any, i: number) => (
              <div key={i} style={{ 
                fontSize: '0.65rem', padding: '6px 8px', borderRadius: '6px', 
                background: v.isStrike ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.05)',
                borderLeft: `2px solid ${v.isStrike ? 'var(--red)' : 'var(--orange)'}`,
                display: 'flex', justifyContent: 'space-between'
              }}>
                <span style={{ color: v.isStrike ? 'var(--red)' : 'var(--cream)' }}>{v.type}</span>
                <span style={{ opacity: 0.4 }}>{new Date(v.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .glass-card { box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
