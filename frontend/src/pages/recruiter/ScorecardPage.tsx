import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { recruiterApi } from '../../services/api.services'
import {
  ChevronLeft, Download, Loader2, Zap, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import CandidateScorecard from '../../components/shared/CandidateScorecard'

export default function ScorecardPage() {
  const { candidateId } = useParams<{ candidateId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [isGenerating, setIsGenerating] = useState(false)
  const [pollInterval, setPollInterval] = useState<number | false>(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['recruiter', 'scorecard', candidateId],
    queryFn: () => recruiterApi.getScorecard(candidateId!),
    enabled: !!candidateId,
    refetchInterval: pollInterval,
  })

  useEffect(() => {
    if (data?.scorecard && isGenerating) {
      setIsGenerating(false)
      setPollInterval(false)
      toast.success('Scorecard generated!')
    }
  }, [data?.scorecard, isGenerating])

  const generateMutation = useMutation({
    mutationFn: () => recruiterApi.generateScorecard(candidateId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruiter', 'scorecard', candidateId] })
      setIsGenerating(true)
      setPollInterval(3000)
    },
    onError: () => {
      setIsGenerating(false)
      toast.error('Failed to generate scorecard. Try again.')
    },
  })

  const downloadMutation = useMutation({
    mutationFn: () => recruiterApi.downloadReport(candidateId!),
    onSuccess: (blob: Blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `scorecard_${candidateId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    },
    onError: () => toast.error('Failed to download PDF'),
  })

  const forwardMutation = useMutation({
    mutationFn: () => recruiterApi.forwardToAdmin(candidateId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruiter', 'scorecard', candidateId] })
      toast.success('Scorecard forwarded to admin!')
    },
    onError: () => toast.error('Failed to forward to admin'),
  })

  const saveNotesMutation = useMutation({
    mutationFn: (vals: { notes: string, rating: number }) => 
      recruiterApi.saveNotes(candidateId!, { recruiterNotes: vals.notes, recruiterRating: vals.rating }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruiter', 'scorecard', candidateId] })
      toast.success('Notes saved!')
    },
    onError: () => toast.error('Failed to save notes'),
  })

  const statusMutation = useMutation({
    mutationFn: (status: string) => recruiterApi.updateCandidateStatus(candidateId!, status),
    onSuccess: (_r, status) => {
      qc.invalidateQueries({ queryKey: ['recruiter', 'scorecard', candidateId] })
      toast.success(`Candidate ${status === 'SHORTLISTED' ? 'shortlisted' : 'rejected'}`)
    },
    onError: () => toast.error('Failed to update status'),
  })

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: '14px', color: 'var(--text-secondary)' }}>
        <div className="spinner" />
        Loading scorecard…
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><AlertTriangle size={36} style={{ opacity: 0.3 }} /></div>
        <div className="empty-title">Scorecard not found</div>
        <button className="btn btn-outline btn-sm" style={{ marginTop: '16px' }} onClick={() => navigate(-1)}>
          <ChevronLeft size={14} /> Go Back
        </button>
      </div>
    )
  }

  const { candidate, scorecard } = data
  const hasScorecard = !!scorecard

  const handleAction = (action: string, extra?: any) => {
    switch(action) {
      case 'generate': generateMutation.mutate(); break
      case 'forward': forwardMutation.mutate(); break
      case 'saveNotes': saveNotesMutation.mutate(extra); break
      case 'reject': if (confirm('Reject this candidate?')) statusMutation.mutate('REJECTED'); break
      case 'shortlist': statusMutation.mutate('SHORTLISTED'); break
    }
  }

  return (
    <div className="fade-in">
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <ChevronLeft size={15} /> Back
        </button>
        <div>
          <h1 style={{ marginBottom: '2px' }}>
            <span style={{ color: 'var(--orange)' }}>
              {candidate?.user?.firstName} {candidate?.user?.lastName}
            </span>
            {' '}— Scorecard
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {candidate?.user?.email} · {candidate?.campaign?.name}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
          {hasScorecard && (
            <>
              <button className="btn btn-outline btn-sm"
                disabled={generateMutation.isPending || isGenerating}
                onClick={() => { if (confirm('Regenerate analysis?')) generateMutation.mutate() }}>
                {generateMutation.isPending || isGenerating ? <Loader2 size={14} className="spin" /> : <Zap size={14} />}
                Regenerate
              </button>
              <button className="btn btn-outline btn-sm"
                disabled={downloadMutation.isPending}
                onClick={() => downloadMutation.mutate()}>
                {downloadMutation.isPending ? <><div className="spinner spinner-sm" />Downloading…</> : <><Download size={14} />Download PDF</>}
              </button>
            </>
          )}
          {candidate?.isForwarded && (
             <span className="badge badge-teal" style={{ padding: '6px 12px' }}>
               Forwarded to Admin
             </span>
          )}
        </div>
      </div>

      {!hasScorecard && !isGenerating && (
        <div style={{
          background: 'var(--bg-elevated)', border: '1px dashed var(--border)',
          borderRadius: 'var(--radius-md)', padding: '48px', textAlign: 'center',
          marginBottom: '24px',
        }}>
          <Zap size={40} style={{ color: 'var(--orange)', opacity: 0.7, marginBottom: '16px' }} />
          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--cream)', marginBottom: '8px' }}>
            Scorecard not generated yet
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '20px' }}>
            AI will analyse all completed rounds and produce a full technical fit report.
          </p>
          <button className="btn btn-primary"
            disabled={generateMutation.isPending}
            onClick={() => generateMutation.mutate()}>
            <Zap size={15} /> Generate Scorecard
          </button>
        </div>
      )}

      {isGenerating && (
        <div style={{
          background: 'var(--orange-soft)', border: '1px solid var(--orange)',
          borderRadius: 'var(--radius-md)', padding: '20px 24px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <Loader2 size={24} style={{ color: 'var(--orange)', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, color: 'var(--cream)' }}>Generating scorecard…</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--orange)' }}>AI is analysing all rounds. Page will update automatically.</div>
          </div>
        </div>
      )}

      {hasScorecard && (
        <CandidateScorecard 
          scorecard={scorecard}
          candidate={candidate}
          role="recruiter"
          showActions={true}
          onAction={handleAction}
        />
      )}
    </div>
  )
}

