import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi, campaignApi } from '../../services/api.services'
import { Plus, X, Copy, Check, Users, Trash2, Pencil, Eye } from 'lucide-react'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  firstName:  z.string().min(1, 'Required'),
  lastName:   z.string().min(1, 'Required'),
  email:      z.string().email('Invalid email'),
  department: z.string().optional(),
  campaignIds: z.array(z.string()).optional(),
})
type FormData = z.infer<typeof schema>

interface RecruiterResult {
  id: string; email: string; firstName: string; lastName: string; tempPassword?: string
  recruiterProfile?: { assignments?: { campaign: { id: string; name: string; status: string } }[] }
}

function CopyBox({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="copy-box">
      <code>{text}</code>
      <button onClick={copy} className="btn btn-ghost btn-icon btn-sm" title="Copy" style={{ flexShrink: 0 }}>
        {copied ? <Check size={14} style={{ color: 'var(--green-dark)' }} /> : <Copy size={14} />}
      </button>
      {copied && <span className="copy-success">Copied!</span>}
    </div>
  )
}

function CreateRecruiterModal({
  onClose, campaigns,
}: { onClose: () => void; campaigns: { id: string; name: string }[] }) {
  const qc = useQueryClient()
  const [result, setResult] = useState<RecruiterResult | null>(null)
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormData) =>
      adminApi.createRecruiter({ ...data, campaignIds: selectedCampaigns }),
    onSuccess: (data) => {
      setResult(data)
      qc.invalidateQueries({ queryKey: ['recruiters'] })
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      qc.invalidateQueries({ queryKey: ['campaign'] })
      toast.success('Recruiter created!')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create recruiter'
      toast.error(msg)
    },
  })

  const toggleCampaign = (id: string) => {
    setSelectedCampaigns(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  if (result) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3 className="modal-title" style={{ color: 'var(--green-dark)' }}>✅ Recruiter Created!</h3>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
          </div>

          <div style={{ padding: '8px 0' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Send the following temporary credentials to <strong style={{ color: 'var(--cream)' }}>{result.email}</strong>. The password is displayed only once.
            </p>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Email</label>
              <CopyBox text={result.email} />
            </div>
            <div className="form-group">
              <label className="form-label">Temporary Password</label>
              {result.tempPassword
                ? <CopyBox text={result.tempPassword} />
                : <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Password not returned — check email.</p>
              }
            </div>
            <div style={{
              marginTop: '14px', padding: '10px 14px',
              background: 'var(--yellow-soft)', border: '1px solid rgba(237,252,129,0.3)',
              borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: '#a88f00',
            }}>
              ⚠️ The recruiter must change this password on first login.
            </div>
          </div>
          

          <div className="modal-footer">
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Create Recruiter</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit(d => mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="grid-2" style={{ gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">First Name <span className="form-required">*</span></label>
              <input {...register('firstName')} className={`form-input ${errors.firstName ? 'input-error' : ''}`} placeholder="Jane" />
              {errors.firstName && <span className="form-error">{errors.firstName.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Last Name <span className="form-required">*</span></label>
              <input {...register('lastName')} className={`form-input ${errors.lastName ? 'input-error' : ''}`} placeholder="Smith" />
              {errors.lastName && <span className="form-error">{errors.lastName.message}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address <span className="form-required">*</span></label>
            <input {...register('email')} type="email" className={`form-input ${errors.email ? 'input-error' : ''}`} placeholder="jane@company.com" />
            {errors.email && <span className="form-error">{errors.email.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Department</label>
            <input {...register('department')} className="form-input" placeholder="Engineering" />
          </div>

          {/* Campaign assignment */}
          {campaigns.length > 0 && (
            <div className="form-group">
              <label className="form-label">Assign to Campaigns</label>
              <div style={{
                maxHeight: '160px', overflowY: 'auto',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                padding: '8px',
              }}>
                {campaigns.map(c => (
                  <label key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 10px', cursor: 'pointer',
                    borderRadius: 'var(--radius-xs)',
                    background: selectedCampaigns.includes(c.id) ? 'var(--orange-soft)' : 'transparent',
                    transition: 'background 0.15s',
                    fontSize: '0.84rem',
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedCampaigns.includes(c.id)}
                      onChange={() => toggleCampaign(c.id)}
                      style={{ accentColor: 'var(--orange)' }}
                    />
                    <span style={{ color: selectedCampaigns.includes(c.id) ? 'var(--orange)' : 'var(--cream)' }}>
                      {c.name}
                    </span>
                  </label>
                ))}
              </div>
              {selectedCampaigns.length > 0 && (
                <span className="form-hint">{selectedCampaigns.length} campaign{selectedCampaigns.length !== 1 ? 's' : ''} selected</span>
              )}
            </div>
          )}

          <div className="modal-footer" style={{ padding: 0, border: 'none', margin: 0 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending ? <><div className="spinner spinner-sm" />Creating...</> : <><Plus size={15} />Create Recruiter</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditRecruiterModal({
  onClose, recruiter, campaigns,
}: { onClose: () => void; recruiter: any; campaigns: { id: string; name: string }[] }) {
  const qc = useQueryClient()
  const currentAssigned = recruiter.recruiterProfile?.assignments?.map((a: any) => a.campaign.id) || []
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>(currentAssigned)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: recruiter.firstName,
      lastName: recruiter.lastName,
      email: recruiter.email,
      department: recruiter.recruiterProfile?.department || ''
    }
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormData) =>
      adminApi.updateRecruiter(recruiter.id, { ...data, campaignIds: selectedCampaigns }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruiters'] })
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      qc.invalidateQueries({ queryKey: ['campaign'] })
      toast.success('Recruiter updated!')
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as any)?.response?.data?.message || 'Failed to update recruiter'
      toast.error(msg)
    },
  })

  const toggleCampaign = (id: string) => {
    setSelectedCampaigns(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Edit Recruiter</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit(d => mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="grid-2" style={{ gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">First Name <span className="form-required">*</span></label>
              <input {...register('firstName')} className={`form-input ${errors.firstName ? 'input-error' : ''}`} placeholder="Jane" />
              {errors.firstName && <span className="form-error">{errors.firstName.message}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Last Name <span className="form-required">*</span></label>
              <input {...register('lastName')} className={`form-input ${errors.lastName ? 'input-error' : ''}`} placeholder="Smith" />
              {errors.lastName && <span className="form-error">{errors.lastName.message}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Email Address (Read-Only)</label>
            <input {...register('email')} type="email" className="form-input" disabled style={{ opacity: 0.6 }} />
          </div>

          <div className="form-group">
            <label className="form-label">Department</label>
            <input {...register('department')} className="form-input" placeholder="Engineering" />
          </div>

          {campaigns.length > 0 && (
            <div className="form-group">
              <label className="form-label">Assign to Campaigns</label>
              <div style={{
                maxHeight: '160px', overflowY: 'auto',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                padding: '8px',
              }}>
                {campaigns.map(c => (
                  <label key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 10px', cursor: 'pointer',
                    borderRadius: 'var(--radius-xs)',
                    background: selectedCampaigns.includes(c.id) ? 'var(--orange-soft)' : 'transparent',
                    transition: 'background 0.15s',
                    fontSize: '0.84rem',
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedCampaigns.includes(c.id)}
                      onChange={() => toggleCampaign(c.id)}
                      style={{ accentColor: 'var(--orange)' }}
                    />
                    <span style={{ color: selectedCampaigns.includes(c.id) ? 'var(--orange)' : 'var(--cream)' }}>
                      {c.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="modal-footer" style={{ padding: 0, border: 'none', margin: 0 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={isPending}>
              {isPending ? <><div className="spinner spinner-sm" />Saving...</> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function RecruitersPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [editingRecruiter, setEditingRecruiter] = useState<any>(null)

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteRecruiter(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruiters'] })
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      qc.invalidateQueries({ queryKey: ['campaign'] })
      toast.success('Recruiter deleted')
    },
    onError: () => toast.error('Failed to delete recruiter')
  })

  const { data: recruiters = [], isLoading } = useQuery({
    queryKey: ['recruiters'],
    queryFn: adminApi.getAllRecruiters,
  })

  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignApi.getAll,
  })

  return (
    <div className="fade-in">
      <div className="section-header">
        <div>
          <h1 style={{ marginBottom: '4px' }}>
            <span style={{ color: 'var(--orange)' }}>Recruiter</span> Management
          </h1>
          <p className="section-subtitle">{recruiters.length} recruiter{recruiters.length !== 1 ? 's' : ''} on the platform</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Add Recruiter
        </button>
      </div>

      {isLoading ? (
        <div className="page-loader"><div className="spinner" /><span>Loading recruiters...</span></div>
      ) : recruiters.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <div className="empty-title">No recruiters yet</div>
          <div className="empty-desc">Add a recruiter to assign them to campaigns</div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: '14px' }} onClick={() => setShowModal(true)}>
            <Plus size={14} /> Add Recruiter
          </button>
        </div>
      ) : (
        <div className="grid-2" style={{ gap: '14px' }}>
          {recruiters.map((r: RecruiterResult) => {
            const assignments = r.recruiterProfile?.assignments || []
            return (
              <div key={r.id} className="card" style={{ padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div className="sidebar-avatar" style={{ width: '42px', height: '42px', fontSize: '0.9rem' }}>
                    {r.firstName[0]}{r.lastName[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--cream)' }}>
                      {r.firstName} {r.lastName}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.email}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn btn-ghost btn-icon btn-sm" title="View Details" onClick={() => navigate(`/admin/recruiters/${r.id}`)}>
                      <Eye size={15} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" title="Edit" onClick={() => setEditingRecruiter(r)}>
                      <Pencil size={15} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--red)' }} title="Delete" onClick={() => {
                      if (confirm(`Remove recruiter ${r.firstName} ${r.lastName}?`)) deleteMutation.mutate(r.id)
                    }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', fontSize: '0.78rem', marginLeft: '8px' }}>
                    <Users size={13} />
                    <span>{assignments.length}</span>
                  </div>
                </div>

                {assignments.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '2px' }}>
                      Assigned Campaigns
                    </div>
                    {assignments.slice(0, 3).map((a) => (
                      <div key={a.campaign.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'var(--bg-elevated)', borderRadius: 'var(--radius-xs)',
                        padding: '6px 10px', fontSize: '0.8rem',
                      }}>
                        <span style={{ color: 'var(--cream)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {a.campaign.name}
                        </span>
                        <span className={`badge ${a.campaign.status === 'ACTIVE' ? 'badge-success' : 'badge-muted'}`} style={{ marginLeft: '8px', flexShrink: 0 }}>
                          {a.campaign.status}
                        </span>
                      </div>
                    ))}
                    {assignments.length > 3 && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', padding: '2px 0' }}>
                        +{assignments.length - 3} more campaign{assignments.length - 3 !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                    No campaigns assigned yet
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <CreateRecruiterModal
          onClose={() => setShowModal(false)}
          campaigns={campaigns.map((c: Record<string, unknown>) => ({ id: c.id as string, name: c.name as string }))}
        />
      )}
      
      {editingRecruiter && (
        <EditRecruiterModal
          recruiter={editingRecruiter}
          onClose={() => setEditingRecruiter(null)}
          campaigns={campaigns.map((c: Record<string, unknown>) => ({ id: c.id as string, name: c.name as string }))}
        />
      )}
    </div>
  )
}
