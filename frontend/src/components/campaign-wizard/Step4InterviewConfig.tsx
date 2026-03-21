import type { CampaignFormData } from '../../pages/admin/CreateCampaignPage'
import { Mic } from 'lucide-react'

interface Props {
  form: CampaignFormData
  update: (patch: Partial<CampaignFormData>) => void
  hasInterviewRound: boolean
}

export default function Step4InterviewConfig({ form, update, hasInterviewRound }: Props) {
  return (
    <div>
      <div style={{ marginBottom: '22px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Mic size={18} style={{ color: 'var(--orange)' }} />
          Interview Configuration
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Configure AI interview settings — applies to all Interview rounds
        </p>
      </div>

      {!hasInterviewRound ? (
        <div style={{
          background: 'var(--yellow-soft)',
          border: '1px solid rgba(237,252,129,0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '18px',
          display: 'flex', alignItems: 'center', gap: '12px',
          color: '#a88f00', fontSize: '0.875rem',
        }}>
          <span style={{ fontSize: '1.5rem' }}>ℹ️</span>
          <div>
            <strong>No Interview rounds configured.</strong>
            <div style={{ marginTop: '2px', opacity: 0.8 }}>
              Go back to Pipeline Builder and add an INTERVIEW or MIXED round to configure this step.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Interview Mode */}
          <div className="form-group">
            <label className="form-label">Interview Mode <span className="form-required">*</span></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
              {(['TEXT', 'AUDIO'] as const).map(mode => (
                <label
                  key={mode}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 16px',
                    background: form.interviewMode === mode ? 'var(--orange-soft)' : 'var(--bg-elevated)',
                    border: `1px solid ${form.interviewMode === mode ? 'rgba(251,133,30,0.5)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  <input
                    type="radio"
                    name="interviewMode"
                    value={mode}
                    checked={form.interviewMode === mode}
                    onChange={() => update({ interviewMode: mode })}
                    style={{ accentColor: 'var(--orange)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: form.interviewMode === mode ? 'var(--orange)' : 'var(--cream)' }}>
                      {mode === 'TEXT' ? '💬 Text Mode' : '🎙️ Audio Mode'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {mode === 'TEXT' ? 'Written Q&A — candidates type responses' : 'Spoken Q&A via TTS + Speech-to-Text'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Interview Depth */}
          <div className="form-group">
            <label className="form-label">Interview Depth</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
              {(['SHALLOW', 'DEEP'] as const).map(depth => (
                <label
                  key={depth}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px 16px',
                    background: form.interviewDepth === depth ? 'var(--teal-soft)' : 'var(--bg-elevated)',
                    border: `1px solid ${form.interviewDepth === depth ? 'rgba(35,151,156,0.4)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  <input
                    type="radio"
                    name="interviewDepth"
                    value={depth}
                    checked={form.interviewDepth === depth}
                    onChange={() => update({ interviewDepth: depth })}
                    style={{ accentColor: 'var(--teal)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: form.interviewDepth === depth ? 'var(--teal)' : 'var(--cream)' }}>
                      {depth === 'SHALLOW' ? '⚡ Shallow' : '🔍 Deep'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {depth === 'SHALLOW' ? 'Broad coverage, surface-level probing' : 'Targeted exploration with follow-ups'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Follow-up Toggle */}
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--cream)' }}>
                AI Follow-up Questions
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                AI will generate contextual follow-ups based on candidate responses
              </div>
            </div>
            <label className="toggle-wrap">
              <span className="toggle">
                <input
                  type="checkbox"
                  checked={!!form.followUpEnabled}
                  onChange={e => update({ followUpEnabled: e.target.checked })}
                />
                <span className="toggle-slider" />
              </span>
            </label>
          </div>

          {/* Summary */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(251,133,30,0.07) 0%, rgba(35,151,156,0.05) 100%)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 18px',
            fontSize: '0.82rem', color: 'var(--text-secondary)',
          }}>
            <strong style={{ color: 'var(--orange)' }}>Configuration Summary: </strong>
            {form.interviewMode} mode · {form.interviewDepth} depth ·{' '}
            Follow-ups {form.followUpEnabled ? 'enabled ✓' : 'disabled'}
          </div>
        </div>
      )}
    </div>
  )
}
