import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../services/api.services'
import { ChevronLeft, Shield, Briefcase, ShieldOff, Trash2, UserCheck, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RecruiterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showDeactivateModal, setShowDeactivateModal] = useState(false)

  const { data: recruiter, isLoading } = useQuery({
    queryKey: ['recruiter-detail', id],
    queryFn: () => adminApi.getRecruiterById(id!),
    enabled: !!id,
  })

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => adminApi.updateRecruiter(id!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruiter-detail', id] })
      qc.invalidateQueries({ queryKey: ['admin-recruiters'] })
      toast.success('Recruiter updated')
      setShowDeactivateModal(false)
    },
    onError: () => toast.error('Failed to update recruiter'),
  })

  const removeFromCampaignMutation = useMutation({
    mutationFn: (campaignId: string) => adminApi.removeRecruiterFromCampaign(id!, campaignId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruiter-detail', id] })
      toast.success('Removed from campaign')
    },
    onError: () => toast.error('Failed to remove'),
  })

  if (isLoading) {
    return (
      <div className="page-loader">
        <div className="spinner" /><span>Loading recruiter...</span>
      </div>
    )
  }

  if (!recruiter) {
    return (
      <div className="empty-state">
        <div className="empty-title">Recruiter not found</div>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/admin/recruiters')}>
          Back to Recruiters
        </button>
      </div>
    )
  }

  const profile = recruiter.recruiterProfile
  const assignments = profile?.assignments || []
  const isActive = recruiter.isActive !== false

  return (
    <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: '16px' }}
        onClick={() => navigate('/admin/recruiters')}>
        <ChevronLeft size={15} /> Back to Recruiters
      </button>

      {/* Header */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: 'var(--grad-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {recruiter.firstName[0]}{recruiter.lastName[0]}
            </div>
            <div>
              <h2 style={{ fontSize: '1.3rem', marginBottom: '2px' }}>
                {recruiter.firstName} {recruiter.lastName}
              </h2>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{recruiter.email}</div>
              {profile?.department && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px' }}>
                  📂 {profile.department}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
              {isActive ? <><UserCheck size={12} /> Active</> : <><ShieldOff size={12} /> Deactivated</>}
            </span>
            {isActive ? (
              <button className="btn btn-outline btn-sm" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
                onClick={() => setShowDeactivateModal(true)}>
                <ShieldOff size={13} /> Deactivate
              </button>
            ) : (
              <button className="btn btn-primary btn-sm"
                onClick={() => updateMutation.mutate({ isActive: true })}>
                <Shield size={13} /> Reactivate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Assigned Campaigns */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '18px 22px 14px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <Briefcase size={17} style={{ color: 'var(--orange)' }} />
          <div>
            <h3 style={{ fontSize: '0.95rem' }}>Assigned Campaigns</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {assignments.length} campaign{assignments.length !== 1 ? 's' : ''} assigned
            </p>
          </div>
        </div>

        {assignments.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div className="empty-icon"><Briefcase size={30} style={{ opacity: 0.3 }} /></div>
            <div className="empty-title">No campaigns assigned</div>
            <div className="empty-desc">Assign this recruiter to campaigns from the Campaign Detail page</div>
          </div>
        ) : (
          <div>
            {assignments.map((a: any) => {
              const camp = a.campaign
              const STATUS_COLORS: Record<string, string> = {
                ACTIVE: 'badge-success', DRAFT: 'badge-warning', PAUSED: 'badge-danger',
                CLOSED: 'badge-muted', ARCHIVED: 'badge-muted',
              }
              return (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '14px 22px',
                  borderBottom: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(251,133,30,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ flex: 1, minWidth: 0 }} onClick={() => navigate(`/admin/campaigns/${camp.id}`)}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--cream)' }}>{camp.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{camp.role}</span>
                      <span className={`badge ${STATUS_COLORS[camp.status] || 'badge-muted'}`} style={{ fontSize: '0.7rem' }}>
                        {camp.status}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {camp._count?.candidates || 0} candidates
                      </span>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-icon btn-sm" title="Remove from campaign"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`Remove this recruiter from "${camp.name}"?`))
                        removeFromCampaignMutation.mutate(camp.id)
                    }}>
                    <Trash2 size={14} style={{ color: 'var(--red)' }} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Deactivate Modal */}
      {showDeactivateModal && (
        <div className="modal-overlay" onClick={() => setShowDeactivateModal(false)}>
          <div className="modal modal-sm fade-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title" style={{ color: 'var(--red)' }}>Deactivate Account</div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  This will prevent <strong>{recruiter.firstName}</strong> from logging in. Campaign assignments are preserved.
                </p>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowDeactivateModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => setShowDeactivateModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: 'var(--red)' }}
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ isActive: false })}>
                {updateMutation.isPending ? 'Deactivating...' : 'Confirm Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
