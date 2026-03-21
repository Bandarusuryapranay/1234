import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { candidateApi } from '../../services/api.services'
import { CheckSquare, AlertTriangle, Clock, FileText, Sun, Moon } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { loadAllModels, enrollFace } from '../../utils/detectionService'
import toast from 'react-hot-toast'

export default function LobbyPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const [rulesAccepted, setRulesAccepted] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['candidate', 'profile'],
    queryFn: candidateApi.getProfile,
  })

  // Start identity verification flow
  const handleStartProcess = async () => {
    if (!profile?.faceDescriptor) {
      setIsScanning(true)
      startCamera()
    } else {
      // Already has identity, go straight to test
      navigate(`/candidate/assessment/${currentRound.id}`)
    }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      loadAllModels() // Warm up models
    } catch (err) {
      toast.error('Camera access denied. Identity verification is required.')
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  const handleCapture = async () => {
    if (!videoRef.current || isEnrolling) return
    setIsEnrolling(true)
    const toastId = toast.loading('Analysing face biometric...')

    try {
      const result = await enrollFace(videoRef.current)
      if (result) {
        await candidateApi.saveFaceIdentity({ 
          descriptor: Array.from(result.descriptor), 
          photoUrl: result.photo 
        })
        toast.success('Identity Verified!', { id: toastId })
        stopCamera()
        setIsScanning(false)
        navigate(`/candidate/assessment/${currentRound.id}`)
      } else {
        toast.error('Face not detected. Please ensure you are in a well-lit area.', { id: toastId })
      }
    } catch (err) {
      toast.error('Enrollment failed. Try again.', { id: toastId })
    } finally {
      setIsEnrolling(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!profile) return null

  const rounds = (profile.rounds || []) as any[]
  
  // Find the first round that isn't completed yet
  const currentRound = rounds.find((r: any) => 
    !r.attempt || (r.attempt.status !== 'COMPLETED' && r.attempt.status !== 'PASSED')
  )

  const isCompleted = profile.status === 'COMPLETED' || (rounds.length > 0 && rounds.every((r: any) => 
    r.attempt?.status === 'COMPLETED' || r.attempt?.status === 'PASSED'
  ))
  const isRejected = profile.status === 'REJECTED'

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      color: 'var(--text-primary)',
      padding: '40px 20px',
      position: 'relative'
    }}>
      {/* Theme Toggle for Candidate */}
      <button 
        onClick={toggleTheme}
        className="btn btn-outline btn-sm"
        style={{ position: 'absolute', top: '20px', right: '20px', borderRadius: '50%', width: '40px', height: '40px', padding: 0 }}
        title="Toggle Theme"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <div className="card fade-in" style={{ maxWidth: '700px', width: '100%', padding: '40px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: '8px', color: 'var(--text-primary)' }}>
            <span style={{ color: 'var(--orange)' }}>Welcome,</span> {user?.firstName}
          </h1>
          <div style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            {profile.campaign?.name} — {profile.campaign?.role}
          </div>
        </div>

        {isRejected ? (
           <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)' }}>
             <AlertTriangle size={48} color="var(--red)" style={{ marginBottom: '16px', marginInline: 'auto' }} />
             <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Assessment Unsuccessful</h2>
             <p style={{ color: 'var(--text-secondary)' }}>Based on the auto-evaluation of your previous round, you did not meet the required threshold to continue. Thank you for your time.</p>
           </div>
        ) : isCompleted ? (
           <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)' }}>
             <CheckSquare size={48} color="var(--green-dark)" style={{ marginBottom: '16px', marginInline: 'auto' }} />
             <h2 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Assessment Completed</h2>
             <p style={{ color: 'var(--text-secondary)' }}>You have completed all requirements for this assessment. We will be in touch!</p>
           </div>
        ) : (
          <>
            {/* Pipeline Overview */}
            <div style={{ background: 'var(--bg-elevated)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="var(--blue)" /> Overview
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Rounds</div>
                  <div style={{ fontWeight: 600 }}>{rounds.length} rounds: {rounds.map((r: any) => r.roundType).join(' · ')}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ color: 'var(--text-muted)' }}>Next Round</div>
                  <div style={{ fontWeight: 600, color: 'var(--green-light)' }}>
                    {currentRound ? `${currentRound.roundType} (${currentRound.timeLimitMinutes} mins)` : 'None'}
                  </div>
                </div>
              </div>
            </div>

            {/* Rules Summary */}
            <div style={{ background: 'rgba(239, 234, 227, 0.05)', borderRadius: '12px', padding: '24px', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} color="var(--orange)" /> Important Guidelines
              </div>

              <ul style={{ paddingLeft: '24px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                <li>
                  <strong style={{ color: 'var(--text-primary)'}}>Active Proctoring:</strong> Your camera, microphone, and screen are monitored strictly.
                </li>
                <li>
                  <strong style={{ color: 'var(--text-primary)'}}>No Navigation:</strong> Tab switching, external window usage, or screen-sharing will result in a strike.
                </li>
                <li>
                  <strong style={{ color: 'var(--text-primary)'}}>Strike Policy:</strong> Receiving 3 strikes will automatically terminate your assessment. No exceptions.
                </li>
              </ul>

              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '16px', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <input 
                  type="checkbox" 
                  className="form-checkbox" 
                  checked={rulesAccepted} 
                  onChange={(e) => setRulesAccepted(e.target.checked)} 
                  style={{ marginTop: '4px' }}
                />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                  I have read and acknowledged the strictly enforced proctoring policies and agree to abide by the assessment rules.
                </span>
              </label>
            </div>

            <button 
              className="btn btn-primary" 
              disabled={!rulesAccepted || !currentRound}
              style={{ width: '100%', padding: '16px', fontSize: '1.1rem', fontWeight: 600 }}
              onClick={handleStartProcess}
            >
              Secure Entrance <Clock size={18} style={{ marginLeft: '8px' }} />
            </button>
          </>
        )}

        {/* ── Identity Verification Overlay ── */}
        {isScanning && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '32px', textAlign: 'center' }}>
               <h2 style={{ color: 'var(--cream)', marginBottom: '8px' }}>Identity Verification</h2>
               <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                 Position your face clearly within the frame. This biometric signature will be used to monitor your assessment session.
               </p>

               <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#000', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px', border: '2px solid var(--orange)' }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                  <div style={{ position: 'absolute', inset: '15%', border: '2px dashed rgba(255,165,0,0.5)', borderRadius: '50%', pointerEvents: 'none' }} />
               </div>

               <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { stopCamera(); setIsScanning(false); }}>Cancel</button>
                  <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleCapture} disabled={isEnrolling}>
                    {isEnrolling ? 'Verifying...' : 'Capture Biometric'}
                  </button>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
