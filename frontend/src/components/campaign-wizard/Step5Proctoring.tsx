import type { CampaignFormData } from '../../pages/admin/CreateCampaignPage'
import { Shield } from 'lucide-react'

interface Props {
  form: CampaignFormData
  update: (patch: Partial<CampaignFormData>) => void
}

const VIOLATION_LABELS: Record<string, { label: string; desc: string; emoji: string }> = {
  PHONE_DETECTED:  { label: 'Phone Detected',     desc: 'Strike when a mobile device is visible in frame', emoji: '📱' },
  FACE_AWAY:       { label: 'Face Away',           desc: 'Strike when candidate looks away from screen', emoji: '👀' },
  MULTIPLE_FACES:  { label: 'Multiple Faces',      desc: 'Strike when more than one face is detected', emoji: '👥' },
  TAB_SWITCH:      { label: 'Tab Switch',          desc: 'Strike when candidate switches browser tabs', emoji: '🔀' },
  FOCUS_LOSS:      { label: 'Focus Loss',          desc: 'Strike when browser window loses focus', emoji: '🖥️' },
  BACKGROUND_VOICE:{ label: 'Background Voice',    desc: 'Flag only (not a strike) — detects nearby speech', emoji: '🔊' },
}

export default function Step5Proctoring({ form, update }: Props) {
  const strikes = form.maxStrikes ?? 3
  const toggles = form.violationToggles!

  const setToggle = (key: keyof typeof toggles, val: boolean) => {
    update({ violationToggles: { ...toggles, [key]: val } })
  }

  return (
    <div>
      <div style={{ marginBottom: '22px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={18} style={{ color: 'var(--orange)' }} />
          Proctoring Configuration
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Configure AI violation detection and automatic termination rules
        </p>
      </div>

      {/* Max Strikes Slider */}
      <div className="card card-sm" style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Maximum Strikes</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Session is terminated when this strike count is reached
            </div>
          </div>
          <div style={{
            width: '48px', height: '48px',
            background: 'var(--grad-primary)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: '1.3rem', color: '#fff',
            boxShadow: '0 4px 12px var(--orange-glow)',
          }}>
            {strikes}
          </div>
        </div>
        <input
          type="range" min={1} max={5} step={1}
          value={strikes}
          onChange={e => update({ maxStrikes: Number(e.target.value) })}
          style={{ width: '100%', accentColor: 'var(--orange)', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          <span>1 — Very Strict</span>
          <span>3 — Recommended</span>
          <span>5 — Lenient</span>
        </div>
      </div>

      {/* Violation Toggles */}
      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Violation Rules
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {(Object.keys(VIOLATION_LABELS) as (keyof typeof toggles)[]).map(key => {
          const info = VIOLATION_LABELS[key]
          const isFlag = key === 'BACKGROUND_VOICE'
          const checked = toggles[key]
          return (
            <div
              key={key}
              style={{
                background: checked ? (isFlag ? 'var(--yellow-soft)' : 'var(--orange-soft)') : 'var(--bg-elevated)',
                border: `1px solid ${checked ? (isFlag ? 'rgba(237,252,129,0.3)' : 'rgba(251,133,30,0.3)') : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '13px 16px',
                display: 'flex', alignItems: 'center', gap: '14px',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: '1.3rem' }}>{info.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: 600, fontSize: '0.875rem',
                  color: checked ? (isFlag ? '#a88f00' : 'var(--orange)') : 'var(--cream)',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  {info.label}
                  {isFlag && (
                    <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}>Flag Only</span>
                  )}
                  {!isFlag && checked && (
                    <span className="badge badge-primary" style={{ fontSize: '0.6rem' }}>Strike</span>
                  )}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {info.desc}
                </div>
              </div>
              <label className="toggle-wrap">
                <span className="toggle">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={e => setToggle(key, e.target.checked)}
                  />
                  <span className="toggle-slider" />
                </span>
              </label>
            </div>
          )
        })}
      </div>

      <div style={{
        marginTop: '18px',
        background: 'rgba(251,55,30,0.06)',
        border: '1px solid rgba(251,55,30,0.2)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px',
        fontSize: '0.8rem',
        color: 'var(--text-secondary)',
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <span style={{ fontSize: '1.2rem' }}>⚠️</span>
        Sessions exceeding <strong style={{ color: 'var(--red)', margin: '0 4px' }}>{strikes}</strong> strikes will be
        automatically terminated and flagged for recruiter review.
      </div>
    </div>
  )
}
