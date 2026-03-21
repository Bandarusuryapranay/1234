import type { CampaignFormData } from '../../pages/admin/CreateCampaignPage'
import { CheckCircle, Zap } from 'lucide-react'

interface Props {
  form: CampaignFormData
  update: (patch: Partial<CampaignFormData>) => void
  onSubmit: () => void
  isSubmitting: boolean
}

const TYPE_EMOJI: Record<string, string> = { MCQ: '📝', CODING: '💻', INTERVIEW: '🎙️', MIXED: '🧩' }

export default function Step6Review({ form, onSubmit, isSubmitting }: Props) {
  const SectionRow = ({ label, value }: { label: string; value: string | number | undefined | null }) => (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '8px 0', borderBottom: '1px solid var(--border-subtle)',
      fontSize: '0.85rem', gap: '10px',
    }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: 'var(--cream)', textAlign: 'right' }}>
        {value || '—'}
      </span>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '22px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle size={18} style={{ color: 'var(--green-dark)' }} />
          Review & Generate
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Confirm your configuration. Clicking "Generate" will create the campaign and trigger AI question generation.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Campaign Meta */}
        <div className="card card-sm">
          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
            Campaign Details
          </div>
          <SectionRow label="Campaign Name" value={form.name} />
          <SectionRow label="Role" value={form.role} />
          <SectionRow label="Department" value={form.department} />
          <SectionRow label="Max Candidates" value={form.maxCandidates} />
          <SectionRow label="Expires At" value={form.expiresAt} />
          <SectionRow label="JD Length" value={`${form.jobDescription.length} characters`} />
        </div>

        {/* Pipeline */}
        <div className="card card-sm">
          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--teal)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>
            Pipeline — {form.rounds.length} Round{form.rounds.length !== 1 ? 's' : ''}
          </div>
          {form.rounds.map((r, i) => (
            <div key={r.id || `round-review-${i}`} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px', marginBottom: '6px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.84rem',
            }}>
              <span>{TYPE_EMOJI[r.roundType]}</span>
              <span className={`round-badge ${r.roundType}`}>{r.roundType}</span>
              <span style={{ flex: 1, color: 'var(--text-secondary)' }}>
                Round {r.order}
              </span>
              {r.timeLimitMinutes && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                  ⏱ {r.timeLimitMinutes}m
                </span>
              )}
              {r.passMarkPercent && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>
                  ✓ {r.passMarkPercent}%
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Interview */}
        {form.rounds.some(r => r.roundType === 'INTERVIEW' || r.roundType === 'MIXED') && (
          <div className="card card-sm">
            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--yellow-dark)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
              Interview Settings
            </div>
            <SectionRow label="Mode" value={form.interviewMode} />
            <SectionRow label="Depth" value={form.interviewDepth} />
            <SectionRow label="Follow-ups" value={form.followUpEnabled ? 'Enabled' : 'Disabled'} />
          </div>
        )}

        {/* Proctoring */}
        <div className="card card-sm">
          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
            Proctoring Rules
          </div>
          <SectionRow label="Max Strikes" value={`${form.maxStrikes} strikes → Auto-terminate`} />
          <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {Object.entries(form.violationToggles || {})
              .filter(([, v]) => v)
              .map(([k]) => (
                <span key={k} className="badge badge-danger" style={{ fontSize: '0.64rem' }}>
                  {k.replace(/_/g, ' ')}
                </span>
              ))}
          </div>
        </div>

        {/* AI Notice */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(134,254,144,0.08) 0%, rgba(35,151,156,0.06) 100%)',
          border: '1px solid rgba(134,254,144,0.2)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          display: 'flex', alignItems: 'flex-start', gap: '12px',
        }}>
          <span style={{ fontSize: '1.6rem' }}>🤖</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--green-dark)', marginBottom: '4px' }}>
              AI Question Pool Generation
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              After submission, the AI will asynchronously generate a question pool based on your JD.
              You'll be notified when the pool is ready for review. Old candidate scores are preserved on regeneration.
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          className="btn btn-primary btn-lg"
          onClick={onSubmit}
          disabled={isSubmitting}
          style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}
        >
          {isSubmitting ? (
            <><div className="spinner spinner-sm" />Creating Campaign...</>
          ) : (
            <><Zap size={18} />Create Campaign & Generate Questions</>
          )}
        </button>
      </div>
    </div>
  )
}
