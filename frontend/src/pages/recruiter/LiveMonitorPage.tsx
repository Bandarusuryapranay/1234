import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { recruiterApi } from '../../services/api.services'
import { ChevronDown, AlertTriangle, Clock, Activity, X, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'

// ------------------------------------------------------------------
//  Violation type labels
// ------------------------------------------------------------------
const VIOLATION_LABELS: Record<string, string> = {
  PHONE_DETECTED:  '📱 Phone Detected',
  FACE_AWAY:       '🔄 Face Away',
  MULTIPLE_FACES:  '👥 Multiple Faces',
  TAB_SWITCH:      '🔀 Tab Switch',
  FOCUS_LOSS:      '🪟 Focus Loss',
  BACKGROUND_VOICE:'🎤 Background Voice',
}

// ------------------------------------------------------------------
//  Strike badge color
// ------------------------------------------------------------------
function strikeBg(count: number) {
  if (count === 0) return { bg: 'var(--green-soft)', color: 'var(--green-dark)' }
  if (count === 1) return { bg: 'var(--yellow-soft)', color: '#a88f00' }
  if (count === 2) return { bg: 'rgba(251,133,30,0.15)', color: 'var(--orange)' }
  return { bg: 'var(--red-soft)', color: 'var(--red)' }
}

function elapsed(attempt: any) {
  if (!attempt || !attempt.startedAt) return '—'
  const end = attempt.completedAt || attempt.terminatedAt || (attempt.status === 'IN_PROGRESS' ? Date.now() : null)
  if (!end) return '—'
  
  const diff = new Date(end).getTime() - new Date(attempt.startedAt).getTime()
  const m = Math.floor(diff / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return `${m}m ${s}s`
}

// ------------------------------------------------------------------
//  Slide-over
// ------------------------------------------------------------------
function CandidateSlideOver({ candidate, onClose, onUpdate }: { candidate: any; onClose: () => void; onUpdate: () => void }) {
  const [reducing, setReducing] = useState(false)
  const strikes = candidate.strikeLog || []
  const activeAttempt = candidate.attempts?.[0]

  const handleReduceStrike = async () => {
    if (!activeAttempt) return
    try {
      setReducing(true)
      await recruiterApi.reduceStrike(activeAttempt.id)
      toast.success('Strike reduced successfully')
      onUpdate()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to reduce strike')
    } finally {
      setReducing(false)
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 180 }}
      />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px, 100vw)',
        background: 'var(--bg-card)', borderLeft: '1px solid var(--border)',
        zIndex: 190, display: 'flex', flexDirection: 'column',
        animation: 'slideFromRight 0.28s ease',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--cream)' }}>
                {candidate.user.firstName} {candidate.user.lastName}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {candidate.user.email}
              </div>
            </div>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 14px', fontSize: '0.8rem', textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: '1.2rem', color: (() => { const { color } = strikeBg(activeAttempt?.strikeCount || 0); return color })() }}>
                  {activeAttempt?.strikeCount || 0}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Strikes</div>
              </div>
              {activeAttempt && (
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 14px', fontSize: '0.8rem', textAlign: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--teal)' }}>
                    {elapsed(activeAttempt)}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Elapsed</div>
                </div>
              )}
            </div>

            {activeAttempt && activeAttempt.strikeCount > 0 && (
              <button 
                className="btn btn-sm btn-outline" 
                onClick={handleReduceStrike}
                disabled={reducing}
                style={{ fontSize: '0.75rem', borderColor: 'var(--orange)', color: 'var(--orange)' }}
              >
                {reducing ? 'Reducing...' : 'Reduce Strike'}
              </button>
            )}
          </div>
        </div>

        {/* Camera placeholder */}
        <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Live Camera Feed
          </div>
          <div style={{
            aspectRatio: '16/9', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px',
            border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.8rem',
          }}>
            <Activity size={28} style={{ opacity: 0.3 }} />
            <span>Live feed requires WebRTC integration</span>
          </div>
        </div>

        {/* Strike log */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Strike Log ({activeAttempt?.strikeCount || strikes.length})
          </div>
          {strikes.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '24px 0' }}>
              No violations recorded ✓
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {strikes.map((s: any, i: number) => {
                const { bg, color } = strikeBg(s.strikeNumber)
                return (
                  <div key={i} style={{
                    background: bg, border: `1px solid ${color}30`,
                    borderRadius: 'var(--radius-sm)', padding: '10px 12px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px'
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color }}>
                        {VIOLATION_LABELS[s.violationType] || s.violationType}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {new Date(s.occurredAt).toLocaleTimeString()}
                        {!s.isStrike && <span style={{ marginLeft: '6px', color: 'var(--yellow-dark)' }}>(flagged only)</span>}
                      </div>
                    </div>
                    {s.isStrike && (
                      <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>
                        #{s.strikeNumber}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ------------------------------------------------------------------
//  Candidate Card (monitor board)
// ------------------------------------------------------------------
function CandidateCard({ candidate, onSelect }: { candidate: any; onSelect: () => void }) {
  const [elapsedStr, setElapsedStr] = useState('—')
  const activeAttempt = candidate.attempts?.[0]
  const strikeCnt = activeAttempt?.strikeCount || 0
  const { bg, color } = strikeBg(strikeCnt)

  useEffect(() => {
    if (!activeAttempt?.startedAt) return
    if (!['IN_PROGRESS'].includes(activeAttempt.status)) {
      setElapsedStr(elapsed(activeAttempt))
      return
    }
    const iv = setInterval(() => setElapsedStr(elapsed(activeAttempt)), 1000)
    return () => clearInterval(iv)
  }, [activeAttempt?.startedAt, activeAttempt?.status])

  return (
    <div
      onClick={onSelect}
      style={{
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', padding: '16px', cursor: 'pointer',
        transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
      }}
      className="monitor-card"
    >
      {/* Pulsing top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
        background: 'var(--grad-secondary)',
        animation: 'pulseBar 2s ease-in-out infinite',
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '4px' }}>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--cream)', fontSize: '0.92rem' }}>
            {candidate.user.firstName} {candidate.user.lastName}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {candidate.user.email}
          </div>
        </div>
        {/* Strike badge */}
        <div style={{
          width: '36px', height: '36px', borderRadius: '50%',
          background: bg, color, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontWeight: 800, fontSize: '1rem',
          border: `2px solid ${color}50`, flexShrink: 0,
          animation: strikeCnt >= 2 ? 'strikePulse 1.5s ease-in-out infinite' : undefined,
        }}>
          {strikeCnt}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', padding: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Elapsed</div>
          <div style={{ fontWeight: 700, color: 'var(--teal)', fontSize: '0.88rem', fontFamily: 'JetBrains Mono, monospace', marginTop: '2px' }}>
            {elapsedStr}
          </div>
        </div>
        <div style={{ flex: 1, background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', padding: '8px', textAlign: 'center', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Max Strikes</div>
          <div style={{ fontWeight: 700, color: 'var(--cream)', fontSize: '0.88rem', marginTop: '2px' }}>
            {activeAttempt?.maxStrikes ?? '—'}
          </div>
        </div>
      </div>

      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '10px', textAlign: 'right' }}>
        Click to view details →
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
//  Main Page
// ------------------------------------------------------------------
export default function LiveMonitorPage() {
  const [searchParams] = useSearchParams()
  const initCampaign = searchParams.get('campaign') || ''
  const [selectedCampaignId, setSelectedCampaignId] = useState(initCampaign)
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)
  const feedRef = useRef<HTMLDivElement>(null)
  const [wsStatus, setWsStatus] = useState<'connected' | 'disconnected'>('disconnected')

  const { data: campaigns = [] } = useQuery({
    queryKey: ['recruiter', 'campaigns'],
    queryFn: recruiterApi.getMyCampaigns,
  })

  useEffect(() => {
    if ((campaigns as any[]).length > 0 && !selectedCampaignId) {
      setSelectedCampaignId((campaigns[0] as any).campaignId)
    }
  }, [campaigns, selectedCampaignId])

  const { data: liveData = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['recruiter', 'monitor', selectedCampaignId],
    queryFn: () => recruiterApi.getLiveMonitor(selectedCampaignId),
    enabled: !!selectedCampaignId,
    refetchInterval: 10000,
  })

  // Simulated WS indicator 
  useEffect(() => {
    if (selectedCampaignId) {
      setWsStatus('disconnected')
      const t = setTimeout(() => setWsStatus('connected'), 800)
      return () => clearTimeout(t)
    }
  }, [selectedCampaignId])

  // Collect all recent strike events for the feed panel
  const allStrikes = (liveData as any[]).flatMap((c: any) =>
    (c.strikeLog || []).map((s: any) => ({
      ...s,
      candidateName: `${c.user.firstName} ${c.user.lastName}`,
    }))
  ).sort((a: any, b: any) =>
    new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
  ).slice(0, 30)

  return (
    <div className="fade-in">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="section-header">
        <div>
          <h1 style={{ marginBottom: '4px' }}>
            <span style={{ color: 'var(--orange)' }}>Live</span> Monitor
          </h1>
          <p className="section-subtitle">
            Real-time proctoring board. Updates every 10 seconds.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* WS status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: wsStatus === 'connected' ? 'var(--green-dark)' : 'var(--text-muted)' }}>
            {wsStatus === 'connected'
              ? <><Wifi size={14} /><span style={{ fontWeight: 600 }}>Live</span></>
              : <><WifiOff size={14} />Connecting…</>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => refetch()}>
            <RefreshCw size={14} className={isFetching ? 'spin-once' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* ── Campaign selector ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: '280px', position: 'relative' }}>
          <select className="form-select" value={selectedCampaignId}
            onChange={e => setSelectedCampaignId(e.target.value)} style={{ fontWeight: 600 }}>
            <option value="">Select a campaign…</option>
            {(campaigns as any[]).map((c: any) => (
              <option key={c.campaignId} value={c.campaignId}>
                {c.campaign.name} — {c.campaign.role}
              </option>
            ))}
          </select>
          <ChevronDown size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
        </div>
        {/* Summary pills */}
        {liveData.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="badge badge-warning" style={{ gap: '5px' }}>
              <Activity size={11} /> {(liveData as any[]).filter((c: any) => c.status === 'IN_PROGRESS').length} Active
            </span>
            <span className="badge badge-success" style={{ gap: '5px' }}>
              <Clock size={11} /> {(liveData as any[]).filter((c: any) => c.status === 'READY').length} Ready
            </span>
          </div>
        )}
      </div>

      {/* ── Two-column layout: grid + feed ────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>
        {/* Left: candidate cards */}
        <div>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', gap: '12px', alignItems: 'center', color: 'var(--text-secondary)' }}>
              <div className="spinner" /> Loading live data…
            </div>
          ) : !selectedCampaignId ? (
            <div className="empty-state">
              <div className="empty-icon"><Activity size={36} style={{ opacity: 0.25 }} /></div>
              <div className="empty-title">Select a campaign</div>
              <div className="empty-desc">Choose a campaign from the dropdown to monitor candidates.</div>
            </div>
          ) : liveData.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Activity size={36} style={{ opacity: 0.25 }} /></div>
              <div className="empty-title">No active candidates</div>
              <div className="empty-desc">No candidates are currently taking the assessment.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {(liveData as any[]).map((c: any) => (
                <CandidateCard key={c.id} candidate={c} onSelect={() => setSelectedCandidate(c)} />
              ))}
            </div>
          )}
        </div>

        {/* Right: strike event feed */}
        <div className="card" style={{ padding: '0', overflow: 'hidden', position: 'sticky', top: '80px' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={15} style={{ color: 'var(--orange)' }} />
            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>Strike Feed</span>
            {allStrikes.length > 0 && (
              <span className="badge badge-danger" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>
                {allStrikes.length}
              </span>
            )}
          </div>

          <div ref={feedRef} style={{ maxHeight: '60vh', overflow: 'auto', padding: '12px' }}>
            {allStrikes.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '32px 0' }}>
                No violations yet ✓
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {allStrikes.map((s: any, i: number) => {
                  const { bg, color } = strikeBg(s.strikeNumber || 1)
                  return (
                    <div key={i} style={{ background: bg, border: `1px solid ${color}25`, borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color }}>
                          {VIOLATION_LABELS[s.violationType] || s.violationType}
                        </span>
                        {s.isStrike && (
                          <span style={{ background: color, color: '#fff', borderRadius: '4px', fontSize: '0.62rem', padding: '1px 5px', fontWeight: 700 }}>
                            Strike #{s.strikeNumber}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--cream)', fontWeight: 500 }}>
                        {s.candidateName}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {new Date(s.occurredAt).toLocaleTimeString()}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Slide-over ─────────────────────────────────────── */}
      {selectedCandidate && (
        <CandidateSlideOver candidate={selectedCandidate} onClose={() => setSelectedCandidate(null)} onUpdate={refetch} />
      )}
    </div>
  )
}
