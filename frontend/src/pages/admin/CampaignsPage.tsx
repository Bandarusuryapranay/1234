import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { campaignApi } from '../../services/api.services'
import { Plus, Search, Eye, Trash2, Pause, Play, Filter, Pencil, Archive } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'badge-success', DRAFT: 'badge-warning', PAUSED: 'badge-danger',
  CLOSED: 'badge-muted', ARCHIVED: 'badge-muted',
}

const STATUS_DOT: Record<string, string> = {
  ACTIVE: 'active', DRAFT: 'draft', PAUSED: 'paused',
  CLOSED: 'inactive', ARCHIVED: 'inactive',
}

const FILTERS = ['All', 'ACTIVE', 'DRAFT', 'PAUSED', 'CLOSED', 'ARCHIVED']

export default function CampaignsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignApi.getAll,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      campaignApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaign status updated')
    },
    onError: () => toast.error('Failed to update status'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => campaignApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaign deleted')
    },
    onError: () => toast.error('Failed to delete campaign'),
  })

  const filtered = campaigns.filter((c: Record<string, unknown>) => {
    const matchSearch =
      (c.name as string).toLowerCase().includes(search.toLowerCase()) ||
      (c.role as string).toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'All' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 style={{ marginBottom: '4px' }}>
            <span style={{ color: 'var(--orange)' }}>Campaign</span> Management
          </h1>
          <p className="section-subtitle">
            {campaigns.length} total · {campaigns.filter((c: Record<string, unknown>) => c.status === 'ACTIVE').length} active
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/admin/campaigns/new')}>
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {/* Search + Filter Bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar" style={{ flex: '1', minWidth: '200px', maxWidth: '320px' }}>
          <Search className="search-bar-icon" size={16} />
          <input
            className="form-input"
            placeholder="Search campaigns or roles..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`btn btn-sm ${statusFilter === f ? 'btn-primary' : 'btn-outline'}`}
              style={{ padding: '5px 12px', fontSize: '0.76rem' }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="page-loader"><div className="spinner" /><span>Loading campaigns...</span></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-title">{search || statusFilter !== 'All' ? 'No matching campaigns' : 'No campaigns yet'}</div>
          <div className="empty-desc">
            {search || statusFilter !== 'All'
              ? 'Try adjusting your search or filter'
              : 'Create your first campaign to start the hiring process'}
          </div>
          {!search && statusFilter === 'All' && (
            <button className="btn btn-primary btn-sm" style={{ marginTop: '14px' }}
              onClick={() => navigate('/admin/campaigns/new')}>
              <Plus size={14} /> Create Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Role</th>
                <th>Department</th>
                <th>Candidates</th>
                <th>Rounds</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((camp: Record<string, unknown>) => {
                const cnt   = (camp._count as { candidates: number })?.candidates ?? 0
                const rnds  = (camp.rounds as unknown[])?.length ?? 0
                const date  = new Date(camp.createdAt as string).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

                return (
                  <tr key={camp.id as string}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className={`status-dot ${STATUS_DOT[camp.status as string] || 'inactive'}`} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{camp.name as string}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>{camp.role as string}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>{(camp.department as string) || '—'}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: 'var(--cream)' }}>{cnt}</span>
                    </td>
                    <td>
                      <span className="badge badge-teal">{rnds} round{rnds !== 1 ? 's' : ''}</span>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_COLORS[camp.status as string] || 'badge-muted'}`}>
                        {camp.status as string}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{date}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="btn btn-ghost btn-icon btn-sm" title="View Details"
                          onClick={() => navigate(`/admin/campaigns/${camp.id}`)}>
                          <Eye size={14} />
                        </button>
                        {camp.status !== 'ACTIVE' && camp.status !== 'ARCHIVED' && (
                          <button className="btn btn-ghost btn-icon btn-sm" title="Activate"
                            style={{ color: 'var(--green-dark)' }}
                            onClick={() => statusMutation.mutate({ id: camp.id as string, status: 'ACTIVE' })}>
                            <Play size={14} />
                          </button>
                        )}
                        {camp.status === 'ACTIVE' && (
                          <button className="btn btn-ghost btn-icon btn-sm" title="Pause"
                            style={{ color: 'var(--yellow-dark)' }}
                            onClick={() => statusMutation.mutate({ id: camp.id as string, status: 'PAUSED' })}>
                            <Pause size={14} />
                          </button>
                        )}
                        {camp.status !== 'ARCHIVED' && (
                          <button className="btn btn-ghost btn-icon btn-sm" title="Archive"
                            style={{ color: 'var(--yellow-dark)' }}
                            onClick={() => {
                              if (confirm(`Archive "${camp.name}"?`))
                                statusMutation.mutate({ id: camp.id as string, status: 'ARCHIVED' })
                            }}>
                            <Archive size={14} />
                          </button>
                        )}
                        <button className="btn btn-ghost btn-icon btn-sm" title="Edit"
                          onClick={() => navigate(`/admin/campaigns/${camp.id}/edit`)}>
                          <Pencil size={14} />
                        </button>
                        <button className="btn btn-ghost btn-icon btn-sm" title="Permanent Delete"
                          style={{ color: 'var(--red)' }}
                          onClick={() => {
                            if (confirm(`Permanently delete "${camp.name}" and all answers? This cannot be undone.`))
                              deleteMutation.mutate(camp.id as string)
                          }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Result count */}
      {!isLoading && filtered.length > 0 && (
        <div style={{ marginTop: '12px', fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'right' }}>
          Showing {filtered.length} of {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}
