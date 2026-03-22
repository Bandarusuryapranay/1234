import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { candidateApi } from '../../services/api.services'
import {
  CheckSquare, AlertTriangle, Clock, FileText,
  Sun, Moon, Lock, CheckCircle, XCircle, ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useThemeStore } from '../../store/themeStore'
import { loadAllModels, enrollFace } from '../../utils/detectionService'
import toast from 'react-hot-toast'

export default function LobbyPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()

  const [rulesAccepted, setRulesAccepted]   = useState(false)
  const [isScanning, setIsScanning]         = useState(false)
  const [isEnrolling, setIsEnrolling]       = useState(false)
  const videoRef  = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // ── Fetch profile ────────────────────────────────────────────
  const { data: profile, isLoading } = useQuery({
    queryKey: ['candidate', 'profile'],
    queryFn:  candidateApi.getProfile,
    refetchInterval: 5000, // poll every 5s so round unlocks live
  })

  const rounds = (profile?.rounds || []) as any[]

  // First round not yet completed
  const currentRound = rounds.find(
    (r: any) => !r.attempt || (r.attempt.status !== 'COMPLETED' && r.attempt.status !== 'PASSED'),
  )

  const isCompleted =
    profile?.status === 'COMPLETED' ||
    (rounds.length > 0 &&
      rounds.every(
        (r: any) => r.attempt?.status === 'COMPLETED' || r.attempt?.status === 'PASSED',
      ))

  const isRejected = profile?.status === 'REJECTED' || profile?.status === 'TERMINATED'

  // ── Camera helpers ────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      loadAllModels() // warm-up models in background
    } catch {
      toast.error('Camera access denied. Identity verification requires camera access.')
      setIsScanning(false)
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  // ── Start flow ───────────────────────────────────────────────
  const handleStartProcess = async () => {
    if (!currentRound) return
    if (!profile?.faceDescriptor) {
      setIsScanning(true)
      startCamera()
    } else {
      navigate(`/candidate/assessment/${currentRound.id}`)
    }
  }

  // ── Capture biometric ────────────────────────────────────────
  const handleCapture = async () => {
    if (!videoRef.current || isEnrolling) return
    setIsEnrolling(true)
    const toastId = toast.loading('Analysing face biometric...')
    try {
      const result = await enrollFace(videoRef.current)
      if (result) {
        await candidateApi.saveFaceIdentity({
          descriptor: Array.from(result.descriptor),
          photoUrl:   result.photo,
        })
        toast.success('Identity Verified!', { id: toastId })
        stopCamera()
        setIsScanning(false)
        navigate(`/candidate/assessment/${currentRound!.id}`)
      } else {
        toast.error('Face not detected. Ensure you are in a well-lit area.', { id: toastId })
      }
    } catch {
      toast.error('Verification failed. Please try again.', { id: toastId })
    } finally {
      setIsEnrolling(false)
    }
  }

  // ── Round status helpers ──────────────────────────────────────
  function getRoundStatus(round: any, index: number) {
    const attempt = round.attempt
    if (!attempt) {
      if (index === 0) return 'unlocked'
      const prev = rounds[index - 1]
      const prevPassed =
        prev?.attempt?.status === 'COMPLETED' && prev?.attempt?.passed === true
      return prevPassed ? 'unlocked' : 'locked'
    }
    if (attempt.status === 'COMPLETED' && attempt.passed === true)  return 'passed'
    if (attempt.status === 'COMPLETED' && attempt.passed === false) return 'failed'
    if (attempt.status === 'IN_PROGRESS') return 'inprogress'
    return 'unlocked'
  }

  function roundBadgeClass(type: string) {
    const map: Record<string, string> = {
      MCQ:       'badge-primary',
      CODING:    'badge-teal',
      INTERVIEW: 'badge-warning',
      MIXED:     'badge-success',
    }
    return map[type] || 'badge-muted'
  }

  // ── Loading ───────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-base)' }}>
        <div className="spinner spinner-lg" />
      </div>
    )
  }

  if (!profile) return null

  // ── Render ────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight:      '100vh',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      background:     'var(--bg-base)',
      color:          'var(--text-primary)',
      padding:        '40px 20px',
      position:       'relative',
    }}>

      {/* ── Theme Toggle ── */}
      <button
        onClick={toggleTheme}
        className="btn btn-ghost btn-icon"
        style={{ position:'absolute', top:20, right:20, borderRadius:'50%' }}
        title="Toggle theme"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* ── Main Card ── */}
      <div
        className="card fade-in"
        style={{ maxWidth:680, width:'100%', padding:'40px', display:'flex', flexDirection:'column', gap:28 }}
      >

        {/* Header */}
        <div style={{ textAlign:'center' }}>
          <h1 style={{ fontSize:'1.8rem', marginBottom:8 }}>
            <span style={{ color:'var(--orange)' }}>Welcome,</span>{' '}
            {user?.firstName}
          </h1>
          <div style={{ color:'var(--text-secondary)', fontSize:'1rem' }}>
            {profile.campaign?.name} — {profile.campaign?.role}
          </div>
        </div>

        {/* ── REJECTED ── */}
        {isRejected && (
          <div style={{
            textAlign:'center', padding:'40px',
            background:'var(--bg-elevated)', borderRadius:12,
            border:'1px solid var(--red-soft)',
          }}>
            <XCircle size={48} color="var(--red)" style={{ marginBottom:16, display:'block', margin:'0 auto 16px' }} />
            <h2 style={{ color:'var(--text-primary)', marginBottom:8 }}>Assessment Unsuccessful</h2>
            <p style={{ color:'var(--text-secondary)', lineHeight:1.6 }}>
              Based on the auto-evaluation of your previous round, you did not meet the required
              threshold to continue. Thank you for participating.
            </p>
          </div>
        )}

        {/* ── ALL COMPLETE ── */}
        {!isRejected && isCompleted && (
          <div style={{
            textAlign:'center', padding:'40px',
            background:'var(--bg-elevated)', borderRadius:12,
            border:'1px solid var(--green-soft)',
          }}>
            <CheckCircle size={48} color="var(--green-dark)" style={{ marginBottom:16, display:'block', margin:'0 auto 16px' }} />
            <h2 style={{ color:'var(--text-primary)', marginBottom:8 }}>Assessment Completed</h2>
            <p style={{ color:'var(--text-secondary)', lineHeight:1.6 }}>
              You have successfully completed all assessment rounds. Your recruiter will review
              your results and be in touch soon!
            </p>
          </div>
        )}

        {/* ── ACTIVE ASSESSMENT ── */}
        {!isRejected && !isCompleted && (
          <>

            {/* Pipeline overview */}
            <div style={{
              background:'var(--bg-elevated)', borderRadius:12,
              padding:'20px 24px', border:'1px solid var(--border)',
            }}>
              <div style={{
                fontSize:'0.9rem', fontWeight:600, color:'var(--text-primary)',
                marginBottom:16, display:'flex', alignItems:'center', gap:8,
              }}>
                <FileText size={16} color="var(--teal)" />
                Assessment Pipeline
              </div>

              {/* Next round quick info */}
              {currentRound && (
                <div style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  paddingBottom:14, marginBottom:14,
                  borderBottom:'1px solid var(--border)',
                }}>
                  <span style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>Next Round</span>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span className={`badge ${roundBadgeClass(currentRound.roundType)}`}>
                      {currentRound.roundType}
                    </span>
                    {currentRound.interviewMode && (
                      <span className="badge badge-muted" style={{ fontSize:'0.6rem' }}>
                        {currentRound.interviewMode}
                      </span>
                    )}
                    <span style={{ fontSize:'0.8rem', color:'var(--text-secondary)' }}>
                      {currentRound.timeLimitMinutes} min
                    </span>
                  </div>
                </div>
              )}

              {/* All rounds list */}
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {rounds.map((round: any, i: number) => {
                  const status = getRoundStatus(round, i)
                  const attempt = round.attempt

                  const borderColor =
                    status === 'passed'     ? 'rgba(134,254,144,0.3)' :
                    status === 'failed'     ? 'rgba(251,55,30,0.25)'  :
                    status === 'inprogress' ? 'rgba(251,133,30,0.3)'  :
                    status === 'unlocked'   ? 'rgba(251,133,30,0.2)'  :
                    'var(--border)'

                  return (
                    <div
                      key={round.id}
                      style={{
                        display:'flex', alignItems:'center', gap:14,
                        padding:'12px 16px', borderRadius:10,
                        background: status === 'locked' ? 'transparent' : 'var(--bg-card)',
                        border:`1px solid ${borderColor}`,
                        opacity: status === 'locked' ? 0.55 : 1,
                        transition:'all 0.25s ease',
                      }}
                    >
                      {/* Status icon */}
                      <div style={{
                        width:34, height:34, borderRadius:8, flexShrink:0,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        background:
                          status === 'passed'     ? 'var(--green-soft)'  :
                          status === 'failed'     ? 'var(--red-soft)'    :
                          status === 'inprogress' ? 'var(--orange-soft)' :
                          status === 'locked'     ? 'var(--bg-elevated)' :
                          'var(--orange-soft)',
                      }}>
                        {status === 'passed'     && <CheckCircle size={18} color="var(--green-dark)" />}
                        {status === 'failed'     && <XCircle     size={18} color="var(--red)" />}
                        {status === 'locked'     && <Lock        size={18} color="var(--text-muted)" />}
                        {status === 'unlocked'   && (
                          <span style={{ fontWeight:800, fontSize:15, color:'var(--orange)' }}>{i + 1}</span>
                        )}
                        {status === 'inprogress' && (
                          <span style={{ fontWeight:800, fontSize:15, color:'var(--orange)' }}>{i + 1}</span>
                        )}
                      </div>

                      {/* Round info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:2 }}>
                          <span style={{ fontWeight:700, fontSize:'0.9rem', color:'var(--text-primary)' }}>
                            Round {i + 1}
                          </span>
                          <span className={`badge ${roundBadgeClass(round.roundType)}`} style={{ fontSize:'0.6rem' }}>
                            {round.roundType}
                          </span>
                          {round.interviewMode && (
                            <span className="badge badge-muted" style={{ fontSize:'0.58rem' }}>
                              {round.interviewMode}
                            </span>
                          )}
                        </div>
                        <div style={{ display:'flex', gap:12, flexWrap:'wrap', fontSize:'0.75rem', color:'var(--text-muted)' }}>
                          {round.timeLimitMinutes  && <span>⏱ {round.timeLimitMinutes} min</span>}
                          {round.questionCount     && <span>📝 {round.questionCount} questions</span>}
                          {round.passMarkPercent   && <span>🎯 Pass: {round.passMarkPercent}%</span>}
                        </div>
                      </div>

                      {/* Right side: score or lock */}
                      <div style={{ flexShrink:0 }}>
                        {status === 'passed' && (
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontWeight:800, fontSize:'1rem', color:'var(--green-dark)' }}>
                              {attempt?.percentScore?.toFixed(1)}%
                            </span>
                            <span className="badge badge-success" style={{ fontSize:'0.58rem' }}>PASSED</span>
                          </div>
                        )}
                        {status === 'failed' && (
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontWeight:800, fontSize:'1rem', color:'var(--red)' }}>
                              {attempt?.percentScore?.toFixed(1)}%
                            </span>
                            <span className="badge badge-danger" style={{ fontSize:'0.58rem' }}>FAILED</span>
                          </div>
                        )}
                        {status === 'inprogress' && (
                          <span className="badge badge-primary pulse" style={{ fontSize:'0.6rem' }}>IN PROGRESS</span>
                        )}
                        {status === 'locked' && (
                          <span style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>Locked</span>
                        )}
                        {status === 'unlocked' && (
                          <ChevronRight size={18} color="var(--orange)" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Rules */}
            <div style={{
              background:'rgba(251,133,30,0.04)', borderRadius:12,
              padding:'20px 24px', border:'1px solid var(--border)',
            }}>
              <div style={{
                fontSize:'0.9rem', fontWeight:600, color:'var(--text-primary)',
                marginBottom:14, display:'flex', alignItems:'center', gap:8,
              }}>
                <AlertTriangle size={16} color="var(--orange)" />
                Important Guidelines
              </div>

              <ul style={{
                paddingLeft:22, color:'var(--text-secondary)',
                display:'flex', flexDirection:'column', gap:10,
                marginBottom:20, fontSize:'0.875rem',
              }}>
                <li>
                  <strong style={{ color:'var(--text-primary)' }}>Active Proctoring: </strong>
                  Your camera, microphone, and screen are monitored strictly throughout every round.
                </li>
                <li>
                  <strong style={{ color:'var(--text-primary)' }}>No Navigation: </strong>
                  Tab switching, external window usage, or screen-sharing will result in a strike.
                </li>
                <li>
                  <strong style={{ color:'var(--text-primary)' }}>Strike Policy: </strong>
                  Receiving 3 strikes will automatically and immediately terminate your session. No exceptions.
                </li>
              </ul>

              {/* Checkbox */}
              <label style={{
                display:'flex', alignItems:'flex-start', gap:12, cursor:'pointer',
                padding:'14px 16px', background:'var(--bg-elevated)',
                borderRadius:8, border:'1px solid var(--border)',
              }}>
                <input
                  type="checkbox"
                  className="form-checkbox"
                  checked={rulesAccepted}
                  onChange={(e) => setRulesAccepted(e.target.checked)}
                  style={{ marginTop:3 }}
                />
                <span style={{ fontSize:'0.875rem', color:'var(--text-primary)', lineHeight:1.5 }}>
                  I have read and acknowledged the strictly enforced proctoring policies and agree
                  to abide by the assessment rules.
                </span>
              </label>
            </div>

            {/* CTA Button */}
            <button
              className="btn btn-primary"
              disabled={!rulesAccepted || !currentRound}
              style={{ width:'100%', padding:'15px', fontSize:'1rem', fontWeight:700 }}
              onClick={handleStartProcess}
            >
              Secure Entrance
              <Clock size={17} style={{ marginLeft:6 }} />
            </button>

          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          IDENTITY VERIFICATION OVERLAY
      ═══════════════════════════════════════════════════════════ */}
      {isScanning && (
        <div style={{
          position:'fixed', inset:0,
          background:'rgba(0,0,0,0.94)',
          zIndex:1000,
          display:'flex', alignItems:'center', justifyContent:'center',
          padding:20,
          animation:'fadeIn 0.25s ease',
        }}>
          <div className="card slide-up" style={{ maxWidth:500, width:'100%', padding:32, textAlign:'center' }}>

            <h2 style={{ color:'var(--cream)', marginBottom:8 }}>Identity Verification</h2>
            <p style={{ fontSize:'0.85rem', color:'var(--text-secondary)', marginBottom:22, lineHeight:1.6 }}>
              Position your face clearly within the oval guide. This biometric will be used
              to monitor your identity throughout the assessment session.
            </p>

            {/* Video feed */}
            <div style={{
              position:'relative', width:'100%', aspectRatio:'4/3',
              background:'#000', borderRadius:14, overflow:'hidden',
              marginBottom:22, border:'2px solid var(--orange)',
              boxShadow:'0 0 24px var(--orange-glow)',
            }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width:'100%', height:'100%', objectFit:'cover', transform:'scaleX(-1)' }}
              />
              {/* Oval guide overlay */}
              <div style={{
                position:'absolute', inset:'12%',
                border:'2px dashed rgba(251,133,30,0.55)',
                borderRadius:'50%',
                pointerEvents:'none',
              }} />
              {/* Corner accents */}
              <div style={{ position:'absolute', top:10, left:10, width:20, height:20, borderTop:'2px solid var(--orange)', borderLeft:'2px solid var(--orange)', borderRadius:'4px 0 0 0' }} />
              <div style={{ position:'absolute', top:10, right:10, width:20, height:20, borderTop:'2px solid var(--orange)', borderRight:'2px solid var(--orange)', borderRadius:'0 4px 0 0' }} />
              <div style={{ position:'absolute', bottom:10, left:10, width:20, height:20, borderBottom:'2px solid var(--orange)', borderLeft:'2px solid var(--orange)', borderRadius:'0 0 0 4px' }} />
              <div style={{ position:'absolute', bottom:10, right:10, width:20, height:20, borderBottom:'2px solid var(--orange)', borderRight:'2px solid var(--orange)', borderRadius:'0 0 4px 0' }} />
            </div>

            {/* Tips */}
            <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:20, lineHeight:1.5 }}>
              Ensure your face is well-lit, centred in the frame, and you are the only person visible.
            </p>

            {/* Buttons */}
            <div style={{ display:'flex', gap:10 }}>
              <button
                className="btn btn-ghost"
                style={{ flex:1 }}
                onClick={() => { stopCamera(); setIsScanning(false) }}
                disabled={isEnrolling}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ flex:2 }}
                onClick={handleCapture}
                disabled={isEnrolling}
              >
                {isEnrolling
                  ? <><div className="spinner spinner-sm" /> Verifying...</>
                  : 'Capture Biometric'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}