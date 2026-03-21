import { useState } from 'react'
import { 
  CheckCircle2, AlertTriangle, Cpu, Trophy, Target, FileText, 
  ThumbsUp, ThumbsDown, Zap, Star, ShieldAlert, Share2, Rocket, Play, Clock
} from 'lucide-react'
import { useRef } from 'react'

interface CandidateScorecardProps {
  scorecard: any
  candidate: any
  showActions: boolean
  role: 'admin' | 'recruiter'
  onAction?: (action: string, data?: any) => void
}

export default function CandidateScorecard({ scorecard, candidate, showActions, role, onAction }: CandidateScorecardProps) {
  const [notes, setNotes] = useState(scorecard?.recruiterNotes || '')
  const [rating, setRating] = useState(scorecard?.recruiterRating || 0)
  const [previewImg, setPreviewImg] = useState<string | null>(null)

  const techFit = scorecard?.technicalFitPercent ?? 0
  const trustScore = scorecard?.trustScore ?? 0
  const gapAnalysis = scorecard?.gapAnalysis || {}
  const roundScores: any[] = scorecard?.roundScores || []
  const strikeLog: any[] = candidate?.strikeLog || []
  const credibility = scorecard?.resumeCredibility || 'MEDIUM'

  const scoreColor = (val: number) => val >= 70 ? 'var(--green-dark)' : val >= 40 ? 'var(--orange)' : 'var(--red)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ── Top score cards ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px' }}>
          <ScoreRing value={techFit} size={100} />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--cream)', fontSize: '1rem' }}>Technical Fit</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>JD Match Score</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '24px' }}>
          <ScoreRing value={trustScore} size={100} />
          <div>
            <div style={{ fontWeight: 700, color: 'var(--cream)', fontSize: '1rem' }}>Trust Score</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>Proctoring Integrity</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Resume Credibility
          </div>
          <div style={{ 
            display: 'inline-flex', padding: '6px 12px', borderRadius: '6px', fontWeight: 700, fontSize: '0.9rem', width: 'fit-content',
            background: credibility === 'HIGH' ? 'var(--green-soft)' : credibility === 'MEDIUM' ? 'var(--yellow-soft)' : 'var(--red-soft)',
            color: credibility === 'HIGH' ? 'var(--green-dark)' : credibility === 'MEDIUM' ? 'var(--yellow-dark)' : 'var(--red)'
          }}>
            {credibility} CONFIDENCE
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Based on AI cross-verification
          </div>
        </div>
      </div>

      {/* ── AI Executive Summary ───────────────────────────── */}
      {gapAnalysis.aiSummary && (
        <div style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '20px',
          borderLeft: '4px solid var(--teal)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <Zap size={18} style={{ color: 'var(--teal)' }} />
            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--teal)', textTransform: 'uppercase' }}>AI Executive Summary</span>
          </div>
          <div style={{ fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--cream)' }}>
            {gapAnalysis.aiSummary}
          </div>
        </div>
      )}

      {/* ── Round Performance ──────────────────────────────── */}
      <div className="card">
        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--cream)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy size={18} style={{ color: 'var(--yellow)' }} /> Performance per Round
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {roundScores.map((r: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                {r.roundType === 'MCQ' ? <Target size={18} /> : r.roundType === 'CODING' ? <Cpu size={18} /> : <FileText size={18} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--cream)' }}>{r.roundType} Round</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <div style={{ flex: 1, height: '6px', background: 'var(--dark-deep)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${r.percentScore}%`, background: scoreColor(r.percentScore) }} />
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: scoreColor(r.percentScore), minWidth: '40px' }}>{Math.round(r.percentScore)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Strengths & Gaps ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--green-dark)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ThumbsUp size={16} /> Key Strengths
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(gapAnalysis.strengths || []).map((s: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={14} style={{ color: 'var(--green)', flexShrink: 0, marginTop: '3px' }} />
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--red)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ThumbsDown size={16} /> Technical Gaps
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(gapAnalysis.gaps || []).map((g: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                <AlertTriangle size={14} style={{ color: 'var(--orange)', flexShrink: 0, marginTop: '3px' }} />
                <span>{g}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Copy-Paste Detection ────────────────────────────── */}
      {scorecard?.copiedCodeDetected && (
        <div style={{ background: '#450a0a', border: '1px solid #991b1b', borderRadius: '8px', padding: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
          <ShieldAlert size={32} style={{ color: '#ef4444', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#fecaca', fontSize: '0.9rem' }}>Suspicious Code Detected</div>
            <p style={{ color: '#fca5a5', fontSize: '0.78rem', marginTop: '2px', lineHeight: 1.5 }}>
              The candidate submitted code that closely matches common online solutions or patterns indicative of copy-paste/LLM usage.
            </p>
          </div>
        </div>
      )}

      {/* ── Candidate Recordings ────────────────────────────── */}
      {candidate.attempts?.some((a: any) => a.recording?.videoUrl) && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--cream)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Play size={18} style={{ color: 'var(--orange)' }} /> Session Recordings
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {candidate.attempts.filter((a: any) => a.recording?.videoUrl).map((att: any, idx: number) => (
              <RecordingReplay key={att.id} attempt={att} index={idx} strikeLog={strikeLog} />
            ))}
          </div>
        </div>
      )}

      {/* ── Strike Log ─────────────────────────────────────── */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={18} style={{ color: 'var(--red)' }} /> Violation & Integrity Log
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}>
              <tr>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Time</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Violation</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Description</th>
                <th style={{ padding: '12px 16px', fontWeight: 600 }}>Evidence</th>
              </tr>
            </thead>
            <tbody style={{ color: 'var(--text-secondary)' }}>
              {strikeLog.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No violations recorded</td>
                </tr>
              ) : (
                strikeLog.map((s, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px' }}>{new Date(s.occurredAt).toLocaleTimeString()}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={s.isStrike ? 'badge badge-danger' : 'badge badge-warning'} style={{ fontWeight: 700 }}>
                        {s.violationType}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{s.metadata?.reason || 'System flagged activity'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      {s.screenshotUrl ? (
                        <button 
                          className="btn btn-sm btn-outline" 
                          style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                          onClick={() => setPreviewImg(s.screenshotUrl)}
                        >
                          View Evidence
                        </button>
                      ) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImg && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}
          onClick={() => setPreviewImg(null)}
        >
          <div className="card fade-in" style={{ maxWidth: '900px', width: '100%', padding: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px' }}>
               <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Proctoring Evidence</span>
               <button className="btn btn-sm btn-ghost" onClick={() => setPreviewImg(null)}>Close</button>
            </div>
            <img src={previewImg} style={{ width: '100%', borderRadius: '8px', display: 'block' }} alt="Violation Evidence" />
          </div>
        </div>
      )}

      {/* ── Recruiter Notes ────────────────────────────────── */}
      <div className="card" style={{ background: 'rgba(251,133,30,0.02)' }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--cream)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} style={{ color: 'var(--orange)' }} /> Recruiter Observations
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Candidate Rating</div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                disabled={role === 'admin'}
                onClick={() => setRating(star)}
                style={{ 
                  background: 'none', border: 'none', cursor: role === 'admin' ? 'default' : 'pointer', 
                  color: star <= rating ? 'var(--yellow)' : 'var(--dark-deep)',
                  transition: 'transform 0.1s'
                }}
              >
                <Star size={24} fill={star <= rating ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Final Assessment Notes</label>
          {role === 'recruiter' ? (
            <textarea
              className="form-control"
              rows={4}
              placeholder="Add your thoughts on cultural fit, communication, etc..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ background: 'var(--dark-deep)', fontSize: '0.88rem' }}
            />
          ) : (
            <div style={{ padding: '16px', background: 'var(--dark-deep)', borderRadius: '8px', border: '1px solid var(--border)', fontStyle: 'italic', fontSize: '0.88rem', color: 'var(--cream)' }}>
              "{notes || 'No notes provided by recruiter.'}"
            </div>
          )}
        </div>

        {role === 'recruiter' && (
          <button 
            className="btn btn-sm btn-orange" 
            style={{ marginTop: '16px' }}
            onClick={() => onAction?.('saveNotes', { notes, rating })}
          >
            Save Observations
          </button>
        )}
      </div>

      {/* ── Action buttons ─────────────────────────────────── */}
      {showActions && (
        <div style={{ 
          display: 'flex', gap: '12px', padding: '24px', background: 'var(--bg-elevated)', 
          borderRadius: '12px', border: '1px solid var(--border)', justifyContent: 'center' 
        }}>
          {role === 'admin' ? (
            <>
              <button className="btn btn-orange" onClick={() => onAction?.('generate')}>
                <Zap size={18} /> Regenerate Scorecard
              </button>
              <button className="btn btn-primary" onClick={() => onAction?.('advance')}>
                <Rocket size={18} /> Advance to Next Stage
              </button>
              <button className="btn btn-danger" onClick={() => onAction?.('reject')}>
                <ThumbsDown size={18} /> Reject Candidate
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-orange" onClick={() => onAction?.('generate')}>
                <Zap size={18} /> Regenerate Scorecard
              </button>
              <button className="btn btn-teal" onClick={() => onAction?.('forward')}>
                <Share2 size={18} /> Forward to HR
              </button>
            </>
          )}
        </div>
      )}

    </div>
  )
}

function RecordingReplay({ attempt, index, strikeLog }: { attempt: any, index: number, strikeLog: any[] }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const myStrikes = strikeLog.filter(s => s.attemptId === attempt.id).sort((a,b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())
  
  const seekTo = (occurredAt: string) => {
    if (!videoRef.current || !attempt.startedAt) return
    const start = new Date(attempt.startedAt).getTime()
    const even = new Date(occurredAt).getTime()
    const diff = (even - start) / 1000
    videoRef.current.currentTime = Math.max(0, diff)
    videoRef.current.play()
    videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-card)' }}>
      <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 600 }}>
          <Clock size={14} style={{ color: 'var(--teal)' }} />
          Round {index + 1}: {attempt.round.roundType} Recording
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Started: {new Date(attempt.startedAt).toLocaleString()}
        </span>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) 1fr', gap: '0', alignItems: 'stretch' }}>
        <div style={{ background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video
            ref={videoRef}
            src={attempt.recording.videoUrl}
            controls
            style={{ width: '100%', maxHeight: '420px', display: 'block' }}
          />
        </div>
        
        <div style={{ padding: '16px', borderLeft: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', maxHeight: '420px', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            Events Over Timeline
          </div>
          
          {myStrikes.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center', padding: '40px 0' }}>
              No violations recorded in this session.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {myStrikes.map((s, si) => {
                const ts = attempt.startedAt ? ((new Date(s.occurredAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000) : 0
                const mm = Math.floor(ts / 60)
                const ss = Math.floor(ts % 60)
                const timeStr = `${mm}:${ss.toString().padStart(2, '0')}`
                
                return (
                  <button
                    key={si}
                    onClick={() => seekTo(s.occurredAt)}
                    style={{
                      background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px',
                      padding: '10px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                      display: 'flex', alignItems: 'center', gap: '10px', width: '100%'
                    }}
                    className="hover-card"
                  >
                    <div style={{ 
                      width: '40px', background: s.isStrike ? 'var(--red-soft)' : 'var(--yellow-soft)',
                      color: s.isStrike ? 'var(--red)' : 'var(--yellow-dark)', fontSize: '0.7rem', fontWeight: 800,
                      borderRadius: '4px', textAlign: 'center', padding: '4px 0'
                    }}>
                      {timeStr}
                    </div>
                    <div style={{ flex: 1 }}>
                       <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--cream)' }}>{s.violationType}</div>
                       <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{s.metadata?.reason || 'Proctoring flag'}</div>
                    </div>
                    <Play size={12} style={{ opacity: 0.5 }} />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ScoreRing({ value, size = 120 }: { value: number; size?: number }) {
  const r = (size - 16) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  const color = value >= 70 ? 'var(--green)' : value >= 40 ? 'var(--orange)' : 'var(--red)'

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border)" strokeWidth={8} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={8} fill="none"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s ease' }}
        />
      </svg>
      <div style={{ fontWeight: 800, fontSize: '1.2rem', color }}>{Math.round(value)}%</div>
    </div>
  )
}

