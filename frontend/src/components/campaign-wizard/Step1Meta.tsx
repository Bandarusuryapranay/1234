import type { CampaignFormData } from '../../pages/admin/CreateCampaignPage'
import { FileText, Upload } from 'lucide-react'

interface Props {
  form: CampaignFormData
  update: (patch: Partial<CampaignFormData>) => void
}

export default function Step1Meta({ form, update }: Props) {
  const jdLen = form.jobDescription.length
  const jdValid = true // Unlimited / No minimum requirement

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} style={{ color: 'var(--primary)' }} />
          Campaign Details
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Provide the basic campaign information and job description
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div className="form-group">
          <label className="form-label">Campaign Name <span className="form-required">*</span></label>
          <input
            className="form-input"
            placeholder="e.g. Senior React Engineer Q1 2025"
            value={form.name}
            onChange={e => update({ name: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Role / Job Title <span className="form-required">*</span></label>
          <input
            className="form-input"
            placeholder="e.g. Senior Frontend Engineer"
            value={form.role}
            onChange={e => update({ role: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Department</label>
          <input
            className="form-input"
            placeholder="e.g. Engineering"
            value={form.department}
            onChange={e => update({ department: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Max Candidates</label>
          <input
            className="form-input"
            type="number"
            placeholder="Leave blank for unlimited"
            value={form.maxCandidates || ''}
            onChange={e => update({ maxCandidates: Number(e.target.value) || undefined })}
          />
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '16px' }}>
        <label className="form-label">Expires At (Optional)</label>
        <input
          className="form-input"
          type="date"
          value={form.expiresAt || ''}
          onChange={e => update({ expiresAt: e.target.value })}
        />
      </div>

      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label className="form-label">
            Job Description <span className="form-required">*</span>
          </label>
          <span style={{
            fontSize: '0.75rem',
            color: 'var(--success)',
            fontWeight: 600,
          }}>
            {jdLen > 0 ? `${jdLen} chars ✓` : ''}
          </span>
        </div>
        <textarea
          className={`form-textarea ${!jdValid && jdLen > 0 ? 'input-error' : ''}`}
          placeholder="Paste the full Job Description here. This is used by the AI to generate relevant questions. The more detailed, the better."
          value={form.jobDescription}
          onChange={e => update({ jobDescription: e.target.value })}
          style={{ minHeight: '180px' }}
        />
        <span className="form-hint">
          💡 Detailed JD produces more relevant questions. Include skills, responsibilities, and requirements.
        </span>
      </div>

      {/* PDF Upload hint */}
      <div style={{
        marginTop: '16px',
        background: 'rgba(99,120,255,0.05)',
        border: '1px dashed var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: '12px',
        color: 'var(--text-secondary)', fontSize: '0.82rem',
      }}>
        <Upload size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <span>PDF upload support coming soon — paste JD text above for now.</span>
      </div>
    </div>
  )
}
