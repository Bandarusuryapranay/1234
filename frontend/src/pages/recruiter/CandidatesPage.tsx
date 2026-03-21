import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { recruiterApi } from '../../services/api.services'
import {
  Search, Mail, Eye, Activity, Monitor, UserCheck, Lock,
  Clock, ChevronDown, Plus, X, RefreshCw, Users, Download, Edit3, Trash2, Minus
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useRolePath } from '../../hooks/useRolePath'

// ------------------------------------------------------------------
//  Status config
// ------------------------------------------------------------------
const STATUS_UI: Record<string, { badgeClass: string; icon: any; label: string }> = {
  LOCKED:      { badgeClass: 'badge-muted',    icon: Lock,       label: 'Locked' },
  INVITED:     { badgeClass: 'badge-blue',     icon: Mail,       label: 'Invited' },
  ONBOARDING:  { badgeClass: 'badge-primary',  icon: Clock,      label: 'Onboarding' },
  READY:       { badgeClass: 'badge-success',  icon: UserCheck,  label: 'Ready' },
  IN_PROGRESS: { badgeClass: 'pulsing-blue',   icon: Activity,   label: 'In Progress' },
  COMPLETED:   { badgeClass: 'badge-teal',     icon: Eye,        label: 'Completed' },
  TERMINATED:  { badgeClass: 'badge-danger',   icon: X,          label: 'Terminated' },
  SHORTLISTED: { badgeClass: 'badge-purple',   icon: UserCheck,  label: 'Shortlisted' },
  REJECTED:    { badgeClass: 'badge-muted',    icon: Trash2,     label: 'Rejected' },
}

// ------------------------------------------------------------------
//  Add Candidate Modal
// ------------------------------------------------------------------
function AddCandidateModal({
  campaignId,
  onClose,
  onSuccess,
}: {
  campaignId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
  })
  const [loading, setLoading] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.firstName || !form.lastName || !form.email) {
      toast.error('First name, last name and email are required')
      return
    }
    setLoading(true)
    try {
      await recruiterApi.addCandidate(campaignId, form)
      toast.success(`${form.firstName} ${form.lastName} added successfully!`)
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add candidate')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Add Candidate</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Candidate will be added with LOCKED status.
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">First Name <span className="form-required">*</span></label>
              <input className="form-input" placeholder="John" value={form.firstName}
                onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name <span className="form-required">*</span></label>
              <input className="form-input" placeholder="Doe" value={form.lastName}
                onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email Address <span className="form-required">*</span></label>
            <input className="form-input" type="email" placeholder="john.doe@company.com" value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" placeholder="+1 (555) 000-0000" value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="modal-footer" style={{ marginTop: '8px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><div className="spinner spinner-sm" />Adding...</> : <><Plus size={15} />Add Candidate</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
//  Bulk Add Modal — CSV Upload with drag-drop + template download
// ------------------------------------------------------------------
function BulkAddModal({
  campaignId,
  onClose,
  onSuccess,
}: {
  campaignId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [result, setResult] = useState<{ added: number; skipped: number; errors: number; results: any[] } | null>(null)

  const downloadTemplate = () => {
    const csv = 'firstName,lastName,email,mobileNo\nJohn,Doe,john.doe@example.com,+1234567890\nJane,Smith,jane.smith@example.com,+0987654321'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'candidate_import_template.csv'
    link.click()
  }

  const processFile = async (file: File) => {
    if (!file || !file.name.endsWith('.csv')) {
      toast.error('Please upload a valid CSV file')
      return
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (parsed) => {
        const rows = (parsed.data as any[]).map(row => ({
          firstName: row.firstName || row['First Name'] || row.firstname || '',
          lastName:  row.lastName  || row['Last Name']  || row.lastname  || '',
          email:     row.email     || row['Email']      || row.Email     || '',
          phone:     row.mobileNo  || row.phone         || row['Mobile'] || '',
        })).filter(r => r.firstName && r.lastName && r.email)

        if (rows.length === 0) {
          toast.error('No valid rows found. Check that your CSV has firstName, lastName, email columns.')
          return
        }

        setLoading(true)
        try {
          const res = await recruiterApi.addBulkCandidates(campaignId, rows)
          setResult(res)
          onSuccess()
        } catch (err: any) {
          toast.error(err?.response?.data?.message || 'Bulk import failed')
        } finally {
          setLoading(false)
        }
      },
      error: () => toast.error('Failed to parse CSV file'),
    })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Bulk Import Candidates</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Upload a CSV file with candidate details.
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        {!result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Template download */}
            <div style={{
              background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
              padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              border: '1px solid var(--border)',
            }}>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--cream)' }}>CSV Template</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>firstName, lastName, email, mobileNo</div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={downloadTemplate}>
                <Download size={13} /> Download
              </button>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault()
                setDragOver(false)
                const file = e.dataTransfer.files[0]
                if (file) processFile(file)
              }}
              style={{
                border: `2px dashed ${dragOver ? 'var(--orange)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)', padding: '36px 24px',
                textAlign: 'center', cursor: 'pointer',
                background: dragOver ? 'var(--orange-soft)' : 'var(--bg-elevated)',
                transition: 'all 0.2s',
              }}
              onClick={() => document.getElementById('csv-file-input')?.click()}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ margin: '0 auto 12px' }} />
                  <div style={{ color: 'var(--text-secondary)' }}>Importing candidates…</div>
                </>
              ) : (
                <>
                  <Users size={36} style={{ color: dragOver ? 'var(--orange)' : 'var(--text-muted)', marginBottom: '12px' }} />
                  <div style={{ fontWeight: 600, color: 'var(--cream)', marginBottom: '6px' }}>
                    Drop CSV file here
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    or <span style={{ color: 'var(--orange)', cursor: 'pointer' }}>click to browse</span>
                  </div>
                </>
              )}
              <input
                id="csv-file-input"
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }}
              />
            </div>

            <div className="modal-footer" style={{ padding: 0, border: 'none' }}>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </div>
        ) : (
          /* Result Summary */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              {[
                { label: 'Added', value: result.added, color: 'var(--green-dark)' },
                { label: 'Skipped (duplicate)', value: result.skipped, color: 'var(--orange)' },
                { label: 'Errors', value: result.errors, color: 'var(--red)' },
              ].map(item => (
                <div key={item.label} style={{
                  background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                  padding: '14px', textAlign: 'center', border: '1px solid var(--border)',
                }}>
                  <div style={{ fontWeight: 800, fontSize: '1.6rem', color: item.color }}>{item.value}</div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', marginTop: '4px' }}>{item.label}</div>
                </div>
              ))}
            </div>
            {result.errors > 0 && (
              <div style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '0.8rem', color: 'var(--red)' }}>
                {result.results.filter((r: any) => r.status === 'error').map((r: any, i: number) => (
                  <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                    ❌ {r.email} — {r.reason}
                  </div>
                ))}
              </div>
            )}
            <div className="modal-footer" style={{ padding: 0, border: 'none' }}>
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


// ------------------------------------------------------------------
//  Edit Candidate Modal
// ------------------------------------------------------------------
function EditCandidateModal({
  candidate,
  onClose,
  onSuccess,
}: {
  candidate: any
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm] = useState({
    firstName: candidate.user.firstName, 
    lastName: candidate.user.lastName, 
    email: candidate.user.email, 
    phone: candidate.phone || '',
  })
  const [loading, setLoading] = useState(false)

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.firstName || !form.lastName || !form.email) {
      toast.error('First name, last name and email are required')
      return
    }
    setLoading(true)
    try {
      await recruiterApi.editCandidate(candidate.id, form)
      toast.success(`${form.firstName} updated successfully!`)
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to edit candidate')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Edit Candidate</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label">First Name <span className="form-required">*</span></label>
              <input className="form-input" placeholder="John" value={form.firstName}
                onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Last Name <span className="form-required">*</span></label>
              <input className="form-input" placeholder="Doe" value={form.lastName}
                onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email Address <span className="form-required">*</span></label>
            <input className="form-input" type="email" placeholder="john.doe@company.com" value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone</label>
            <input className="form-input" placeholder="+1 (555) 000-0000" value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div className="modal-footer" style={{ marginTop: '8px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><div className="spinner spinner-sm" />Saving...</> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
//  Delete Candidate Modal
// ------------------------------------------------------------------
function DeleteCandidateModal({
  candidate,
  onClose,
  onSuccess,
}: {
  candidate: any
  onClose: () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      await recruiterApi.deleteCandidate(candidate.id)
      toast.success(`Candidate removed!`)
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete candidate')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm fade-in" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ color: 'var(--red)' }}>Delete Candidate</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: '0 0 20px 0', color: 'var(--text-secondary)' }}>
          Are you sure you want to delete <strong>{candidate.user.firstName} {candidate.user.lastName}</strong>? This action cannot be undone.
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn" style={{ background: 'var(--red)', color: 'white' }} onClick={handleDelete} disabled={loading}>
            {loading ? <><div className="spinner spinner-sm" />Deleting...</> : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------
//  Main Page
// ------------------------------------------------------------------
export default function CandidatesPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { prefix, monitorPath, candidatePath } = useRolePath()
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [showAddModal, setShowAddModal] = useState(false)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkAddModal, setShowBulkAddModal] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const [editingCandidate, setEditingCandidate] = useState<any | null>(null)
  const [deletingCandidate, setDeletingCandidate] = useState<any | null>(null)

  const { data: campaigns = [], isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['recruiter', 'campaigns'],
    queryFn: recruiterApi.getMyCampaigns,
  })

  // Auto-select first campaign
  useEffect(() => {
    if (campaigns.length > 0 && !selectedCampaignId) {
      const first = campaigns[0] as any
      setSelectedCampaignId(first.campaignId)
    }
  }, [campaigns, selectedCampaignId])

  // Clear selections when campaign changes
  useEffect(() => {
    setSelectedIds(new Set())
  }, [selectedCampaignId])

  const { data: candidates = [], isLoading: isLoadingCandidates, isFetching, refetch } = useQuery({
    queryKey: ['recruiter', 'candidates', selectedCampaignId],
    queryFn: () => recruiterApi.getCandidates(selectedCampaignId),
    enabled: !!selectedCampaignId,
    refetchInterval: 15000, // poll every 15s
  })

  const grantMutation = useMutation({
    mutationFn: (id: string) => recruiterApi.grantPermission(id),
    onSuccess: (res: any, _id: string) => {
      qc.invalidateQueries({ queryKey: ['recruiter', 'candidates', selectedCampaignId] })
      toast.success(`Credentials sent to ${res.email}`)
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(_id)
        return next
      })
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to send credentials'),
  })

  const bulkGrantMutation = useMutation({
    mutationFn: (ids: string[]) => recruiterApi.grantBulkPermission(ids),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['recruiter', 'candidates', selectedCampaignId] })
      const successCount = res.results.filter((r: any) => r.success).length
      toast.success(`Credentials sent to ${successCount} candidates!`)
      setSelectedIds(new Set())
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed to send credentials'),
  })

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(filtered.filter(c => c.status === 'LOCKED').map(c => c.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const activeCampaign = (campaigns as any[]).find(c => c.campaignId === selectedCampaignId)

  const filtered = (candidates as any[]).filter(c => {
    const term = search.toLowerCase()
    const name = `${c.user.firstName} ${c.user.lastName}`.toLowerCase()
    const email = c.user.email.toLowerCase()
    const matchSearch = name.includes(term) || email.includes(term)
    const matchStatus = statusFilter === 'ALL' || c.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleExport = (format: 'csv' | 'xlsx' | 'pdf') => {
    if (filtered.length === 0) {
      toast.error('No candidates to export')
      return
    }

    const exportData = filtered.map(c => {
      const score = Math.round(c.scorecard?.technicalFitPercent || 0)
      const strikes = c.strikeLog?.length || 0
      return {
        Name: `${c.user.firstName} ${c.user.lastName}`,
        Email: c.user.email,
        Status: c.status,
        FitScore: ['COMPLETED', 'TERMINATED', 'SHORTLISTED', 'REJECTED'].includes(c.status) ? `${score}%` : 'N/A',
        Strikes: strikes,
        LastActive: c.user.lastLoginAt ? new Date(c.user.lastLoginAt).toLocaleDateString() : 'Never',
      }
    })

    const fileName = `Candidates_${activeCampaign?.campaign?.name || 'Export'}_${new Date().toISOString().split('T')[0]}`

    if (format === 'csv') {
      const csv = Papa.unparse(exportData)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${fileName}.csv`
      link.click()
    } else if (format === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet(exportData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidates')
      XLSX.writeFile(workbook, `${fileName}.xlsx`)
    } else if (format === 'pdf') {
      const doc = new jsPDF()
      doc.text(`Candidates: ${activeCampaign?.campaign?.name || ''}`, 14, 15)
      doc.setFontSize(10)
      doc.setTextColor(100)
      doc.text(`Exported on ${new Date().toLocaleDateString()}`, 14, 22)
      
      const head = [['Name', 'Email', 'Status', 'Fit Score', 'Strikes', 'Last Active']]
      const body = exportData.map(d => [d.Name, d.Email, d.Status, d.FitScore, d.Strikes.toString(), d.LastActive])
      
      autoTable(doc, {
        startY: 28,
        head,
        body,
        theme: 'grid',
        headStyles: { fillColor: [35, 151, 156] },
      })
      doc.save(`${fileName}.pdf`)
    }
  }


  // Status count pills
  const statusCounts = (candidates as any[]).reduce((acc: any, c: any) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="fade-in">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="section-header">
        <div>
          <h1 style={{ marginBottom: '4px' }}>
            <span style={{ color: 'var(--orange)' }}>Candidate</span> Management
          </h1>
          <p className="section-subtitle">
            Manage permissions, track progress, and review scorecards across your campaigns.
          </p>
        </div>
        {selectedCampaignId && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => refetch()}
              title="Refresh" style={{ gap: '6px' }}>
              <RefreshCw size={14} className={isFetching ? 'spin-once' : ''} />
              Refresh
            </button>
            <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
            
            <div style={{ position: 'relative' }}>
              <button className="btn btn-outline" onClick={() => setShowExportMenu(!showExportMenu)}>
                <Download size={15} /> Export <ChevronDown size={12} style={{ marginLeft: '4px' }} />
              </button>
              {showExportMenu && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', padding: '6px', minWidth: '140px',
                  zIndex: 50, display: 'flex', flexDirection: 'column', gap: '2px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}
                onMouseLeave={() => setShowExportMenu(false)}>
                  <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => { handleExport('csv'); setShowExportMenu(false) }}>Export as CSV</button>
                  <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => { handleExport('xlsx'); setShowExportMenu(false) }}>Export as Excel</button>
                  <button className="btn btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => { handleExport('pdf'); setShowExportMenu(false) }}>Export as PDF</button>
                </div>
              )}
            </div>

            <button className="btn btn-outline" onClick={() => setShowBulkAddModal(true)}>
              <Users size={15} /> Bulk Add
            </button>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}
              id="add-candidate-btn">
              <Plus size={15} /> Add Candidate
            </button>
          </div>
        )}
      </div>

      {/* ── Campaign Selector + Search ───────────────────────── */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1.5', minWidth: '240px', position: 'relative' }}>
          <select className="form-select" value={selectedCampaignId}
            onChange={e => setSelectedCampaignId(e.target.value)}
            style={{ fontWeight: 600 }} disabled={isLoadingCampaigns}>
            {campaigns.length === 0 && <option value="">No campaigns assigned</option>}
            {(campaigns as any[]).map((c: any) => (
              <option key={c.campaignId} value={c.campaignId}>
                {c.campaign.name} — {c.campaign.role}
              </option>
            ))}
          </select>
          <ChevronDown size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
        </div>

        <div style={{ flex: '2', minWidth: '220px', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input className="form-input" placeholder="Search by name or email..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '38px' }} />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ flex: '1', minWidth: '160px', position: 'relative' }}>
          <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            {Object.keys(STATUS_UI).map(s => (
              <option key={s} value={s}>{STATUS_UI[s].label} {statusCounts[s] ? `(${statusCounts[s]})` : ''}</option>
            ))}
          </select>
          <ChevronDown size={15} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* ── Status quick-pills ───────────────────────────────── */}
      {candidates.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button onClick={() => setStatusFilter('ALL')}
            className={`badge ${statusFilter === 'ALL' ? 'badge-primary' : 'badge-muted'}`}
            style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit', padding: '5px 12px' }}>
            All ({(candidates as any[]).length})
          </button>
          {(['IN_PROGRESS', 'READY', 'COMPLETED', 'SHORTLISTED', 'TERMINATED'] as string[]).map(s => {
            if (!statusCounts[s]) return null
            const ui = STATUS_UI[s]
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`badge ${statusFilter === s ? ui.badgeClass : 'badge-muted'}`}
                style={{ cursor: 'pointer', border: 'none', fontFamily: 'inherit', padding: '5px 12px' }}>
                {ui.label} ({statusCounts[s]})
              </button>
            )
          })}
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────── */}
      {isLoadingCampaigns ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', gap: '12px', alignItems: 'center', color: 'var(--text-secondary)' }}>
          <div className="spinner" /> Loading campaigns…
        </div>
      ) : campaigns.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Users size={40} style={{ opacity: 0.3 }} /></div>
          <div className="empty-title">No campaigns assigned</div>
          <div className="empty-desc">You haven't been assigned to any campaigns yet. Contact your administrator.</div>
        </div>
      ) : isLoadingCandidates ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', gap: '12px', alignItems: 'center', color: 'var(--text-secondary)' }}>
          <div className="spinner" /> Loading candidates…
        </div>
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          {/* Card header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--cream)' }}>{activeCampaign?.campaign?.name}</span>
              <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.82rem' }}>
                — {activeCampaign?.campaign?.role}
              </span>
              {isFetching && <div className="spinner spinner-sm" />}
            </h3>
            <span className="badge badge-muted">{filtered.length} candidates</span>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 20px', border: 'none' }}>
              <div className="empty-icon"><Users size={36} style={{ opacity: 0.25 }} /></div>
              <div className="empty-title">{search || statusFilter !== 'ALL' ? 'No matches found' : 'No candidates yet'}</div>
              <div className="empty-desc">
                {search || statusFilter !== 'ALL'
                  ? 'Try adjusting your search or filter.'
                  : 'Add candidates to this campaign to get started.'}
              </div>
              {!search && statusFilter === 'ALL' && (
                <button className="btn btn-primary btn-sm" style={{ marginTop: '16px' }}
                  onClick={() => setShowAddModal(true)}>
                  <Plus size={14} /> Add First Candidate
                </button>
              )}
            </div>
          ) : (
            <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
              {selectedIds.size > 0 && (
                <div style={{ background: 'var(--green-soft)', padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--green-dark)' }}>
                    {selectedIds.size} candidate(s) selected
                  </span>
                  <button className="btn btn-primary btn-sm"
                    onClick={() => bulkGrantMutation.mutate(Array.from(selectedIds))}
                    disabled={bulkGrantMutation.isPending}>
                    {bulkGrantMutation.isPending ? <div className="spinner spinner-sm" /> : <Mail size={14} />}
                    Grant Permission ({selectedIds.size})
                  </button>
                </div>
              )}
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40px', paddingRight: 0 }}>
                      <input type="checkbox" className="form-checkbox"
                        checked={filtered.filter(c => c.status === 'LOCKED').length > 0 && selectedIds.size === filtered.filter(c => c.status === 'LOCKED').length}
                        onChange={handleSelectAll}
                        disabled={filtered.filter(c => c.status === 'LOCKED').length === 0}
                      />
                    </th>
                    <th>Candidate</th>
                    <th>Status</th>
                    <th>Fit Score</th>
                    <th>Strikes</th>
                    <th>Last Active</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c: any) => {
                    const ui = STATUS_UI[c.status] || STATUS_UI['LOCKED']
                    const SIcon = ui.icon
                    const isPulsing = c.status === 'IN_PROGRESS'
                    const strikes = c.strikeLog?.length || 0
                    const strikeCls = strikes === 0 ? 'badge-success' : strikes < 3 ? 'badge-warning' : 'badge-danger'
                    const score = Math.round(c.scorecard?.technicalFitPercent || 0)
                    const scoreColor = score >= 70 ? 'var(--green-light)' : score >= 40 ? 'var(--orange)' : score > 0 ? 'var(--red)' : 'var(--text-muted)'
                    
                    // Logic for showing columns
                    const showScore = ['COMPLETED', 'TERMINATED', 'SHORTLISTED', 'REJECTED'].includes(c.status)
                    const showStrikes = !['LOCKED', 'INVITED'].includes(c.status)

                    return (
                      <tr key={c.id} className={selectedIds.has(c.id) ? 'selected-row' : ''}>
                        <td style={{ paddingRight: 0 }}>
                          <input type="checkbox" className="form-checkbox"
                            checked={selectedIds.has(c.id)}
                            onChange={() => toggleSelect(c.id)}
                            disabled={c.status !== 'LOCKED'}
                          />
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                              background: 'var(--grad-primary)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.75rem', fontWeight: 700, color: '#fff'
                            }}>
                              {c.user.firstName[0]}{c.user.lastName[0]}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--cream)', fontSize: '0.88rem' }}>
                                {c.user.firstName} {c.user.lastName}
                              </div>
                              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                                {c.user.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                            <span
                              className={`badge ${ui.badgeClass}`}
                            >
                              <SIcon size={11} className={c.status === 'IN_PROGRESS' ? 'spin-once' : ''} />
                              {ui.label}
                            </span>
                            {c.isForwarded && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--teal)', textTransform: 'uppercase' }}>
                                Fwd to Admin
                              </span>
                            )}
                            {c.adminDecision && !c.isForwarded && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: c.adminDecision === 'ADVANCED' ? 'var(--green-dark)' : 'var(--red)', textTransform: 'uppercase' }}>
                                Admin {c.adminDecision}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          {showScore ? (
                            <div style={{ fontWeight: 700, color: scoreColor, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              {score}%
                            </div>
                          ) : c.resumeUrl ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--blue)', fontSize: '0.8rem', cursor: 'pointer' }} 
                                 title="Download Resume" onClick={() => window.open(c.resumeUrl, '_blank')}>
                              <Download size={12} /> Resume
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Pending</span>
                          )}
                        </td>

                        <td>
                          {showStrikes ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className={`badge ${strikeCls}`}
                                style={{ fontVariantNumeric: 'tabular-nums', minWidth: '24px', justifyContent: 'center' }}>
                                {strikes}
                              </span>
                              {strikes > 0 && (
                                <button
                                  className="btn btn-ghost btn-icon btn-sm"
                                  title="Reduce Strike"
                                  onClick={async (e) => {
                                    e.stopPropagation()
                                    if (!window.confirm('Reduce one strike for this candidate?')) return
                                    try {
                                      // Get the most relevant attempt (the one with the latest strikes or IN_PROGRESS)
                                      const att = c.attempts?.find((a: any) => a.strikeCount > 0) || c.attempts?.[0]
                                      if (att) {
                                        await recruiterApi.reduceStrike(att.id)
                                        toast.success('Strike reduced. Refreshing...')
                                        refetch()
                                      }
                                    } catch (err: any) {
                                      toast.error(err.response?.data?.message || 'Failed to reduce strike')
                                    }
                                  }}
                                  style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)', padding: '2px' }}
                                >
                                  <Minus size={12} style={{ color: 'var(--orange)' }} />
                                </button>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                          )}
                        </td>

                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {c.user.lastLoginAt
                            ? new Date(c.user.lastLoginAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                            : 'Never'}
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', alignItems: 'center' }}>
                            {c.status === 'LOCKED' && (
                              <button className="btn btn-primary btn-sm"
                                onClick={() => grantMutation.mutate(c.id)}
                                disabled={grantMutation.isPending && grantMutation.variables === c.id}>
                                {grantMutation.isPending && grantMutation.variables === c.id
                                  ? <><div className="spinner spinner-sm" />Sending…</>
                                  : <><Mail size={13} />Grant Permission</>}
                              </button>
                            )}
                            {c.status === 'INVITED' && (
                              <button className="btn btn-outline btn-sm"
                                onClick={() => grantMutation.mutate(c.id)}
                                disabled={grantMutation.isPending && grantMutation.variables === c.id}>
                                <RefreshCw size={13} /> Resend
                              </button>
                            )}
                            {c.status === 'IN_PROGRESS' && (
                              <button className="btn btn-secondary btn-sm"
                                onClick={() => navigate(monitorPath(selectedCampaignId))}>
                                <Monitor size={13} /> Monitor Live
                              </button>
                            )}
                            {['COMPLETED', 'TERMINATED', 'SHORTLISTED', 'REJECTED'].includes(c.status) && (
                              <button className="btn btn-outline btn-sm"
                                onClick={() => navigate(candidatePath(c.id))}>
                                <Eye size={13} /> Scorecard
                              </button>
                            )}
                            {['ONBOARDING', 'READY'].includes(c.status) && (
                              <button className="btn btn-outline btn-sm"
                                onClick={() => navigate(candidatePath(c.id))}>
                                <Activity size={13} /> View Progress
                              </button>
                            )}
                            
                            {/* Action Menu / Icons */}
                            <button className="btn btn-ghost btn-sm btn-icon" title="Edit" onClick={() => setEditingCandidate(c)}>
                              <Edit3 size={14} style={{ color: 'var(--text-muted)' }} />
                            </button>
                            <button className="btn btn-ghost btn-sm btn-icon" title="Delete" onClick={() => setDeletingCandidate(c)}>
                              <Trash2 size={14} style={{ color: 'var(--red)' }} />
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
        </div>
      )}

      {/* ── Add Candidate Modal ─────────────────────────────── */}
      {showAddModal && selectedCampaignId && (
        <AddCandidateModal
          campaignId={selectedCampaignId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['recruiter', 'candidates', selectedCampaignId] })}
        />
      )}

      {showBulkAddModal && selectedCampaignId && (
        <BulkAddModal
          campaignId={selectedCampaignId}
          onClose={() => setShowBulkAddModal(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['recruiter', 'candidates', selectedCampaignId] })}
        />
      )}

      {editingCandidate && (
        <EditCandidateModal
          candidate={editingCandidate}
          onClose={() => setEditingCandidate(null)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['recruiter', 'candidates', selectedCampaignId] })}
        />
      )}

      {deletingCandidate && (
        <DeleteCandidateModal
          candidate={deletingCandidate}
          onClose={() => setDeletingCandidate(null)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['recruiter', 'candidates', selectedCampaignId] })}
        />
      )}
    </div>
  )
}