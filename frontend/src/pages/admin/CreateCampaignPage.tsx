import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { campaignApi } from '../../services/api.services'
import toast from 'react-hot-toast'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import Step1Meta from '../../components/campaign-wizard/Step1Meta'
import Step2Pipeline from '../../components/campaign-wizard/Step2Pipeline'
import Step3RoundConfig from '../../components/campaign-wizard/Step3RoundConfig'
import Step4InterviewConfig from '../../components/campaign-wizard/Step4InterviewConfig'
import Step5Proctoring from '../../components/campaign-wizard/Step5Proctoring'
import Step6Review from '../../components/campaign-wizard/Step6Review'

export interface Round {
  id: string
  order: number
  roundType: 'MCQ' | 'CODING' | 'INTERVIEW' | 'MIXED'
  totalQuestions?: number
  timeLimitMinutes?: number
  passMarkPercent?: number
  shuffleQuestions?: boolean
  negativeMarking?: boolean
  penaltyPerWrong?: number
  marksPerQuestion?: number
  difficultyEasy?: number
  difficultyMedium?: number
  difficultyHard?: number
  // Question mode
  questionMode?: 'JD_BASED' | 'APTITUDE' | 'DSA'
  topicTags?: string[]
  // Coding
  allowedLanguages?: string[]
  // Interview
  interviewMode?: 'TEXT' | 'AUDIO' | 'LIVE_CODING'
  depth?: 'SHALLOW' | 'DEEP'
  followUpEnabled?: boolean
  resumeSplitPercent?: number
  // General
  timerMode?: 'SHARED' | 'PER_SLICE'
  failAction?: string
  slices?: {
    type: 'MCQ' | 'CODING' | 'INTERVIEW'
    count: number
    timeLimitMinutes?: number
  }[]
}

export interface CampaignFormData {
  // Step 1
  name: string
  role: string
  department: string
  jobDescription: string
  expiresAt?: string
  maxCandidates?: number
  // Step 2-3
  rounds: Round[]
  // Step 4
  interviewMode?: 'TEXT' | 'AUDIO'
  interviewDepth?: 'SHALLOW' | 'DEEP'
  followUpEnabled?: boolean
  // Step 5
  maxStrikes?: number
  violationToggles?: {
    PHONE_DETECTED: boolean
    FACE_AWAY: boolean
    MULTIPLE_FACES: boolean
    TAB_SWITCH: boolean
    FOCUS_LOSS: boolean
    BACKGROUND_VOICE: boolean
  }
}

const STEPS = [
  { label: 'Campaign Meta', short: '1' },
  { label: 'Pipeline', short: '2' },
  { label: 'Round Config', short: '3' },
  { label: 'Interview', short: '4' },
  { label: 'Proctoring', short: '5' },
  { label: 'Review', short: '6' },
]

const defaultForm: CampaignFormData = {
  name: '', role: '', department: '', jobDescription: '',
  rounds: [],
  maxStrikes: 3,
  violationToggles: {
    PHONE_DETECTED: true,
    FACE_AWAY: true,
    MULTIPLE_FACES: true,
    TAB_SWITCH: true,
    FOCUS_LOSS: true,
    BACKGROUND_VOICE: false,
  },
  interviewMode: 'TEXT',
  interviewDepth: 'DEEP',
  followUpEnabled: true,
}

export default function CreateCampaignPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<CampaignFormData>(defaultForm)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const update = (patch: Partial<CampaignFormData>) =>
    setForm(prev => ({ ...prev, ...patch }))

  const hasInterviewRound = form.rounds.some(
    r => r.roundType === 'INTERVIEW' || r.roundType === 'MIXED'
  )

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        role: form.role,
        department: form.department || undefined,
        jobDescription: form.jobDescription,
        expiresAt: (form.expiresAt && form.expiresAt.trim() !== '') ? new Date(form.expiresAt).toISOString() : null,
        maxCandidates: form.maxCandidates || undefined,
        pipelineConfig: {
          timerMode: 'SHARED',
          proctoring: {
            maxStrikes: form.maxStrikes,
            violations: form.violationToggles,
          },
          rounds: form.rounds.map((r, i) => {
            const mapped: any = { ...r, order: i + 1 }
            if (r.roundType === 'MCQ') {
              mapped.totalQuestions = r.totalQuestions;
              mapped.aptitudeTopics = r.topicTags;
              mapped.questionMode   = r.questionMode || 'JD-BASED';
            } else if (r.roundType === 'CODING') {
              mapped.problemCount = r.totalQuestions;
              mapped.dsaTopics = r.topicTags;
              mapped.questionMode   = r.questionMode || 'DSA';
            } else if (r.roundType === 'INTERVIEW') {
              mapped.questionCount = r.totalQuestions;
              mapped.resumeSplit   = r.resumeSplitPercent;
              mapped.questionMode   = r.questionMode || 'JD-BASED';
            }
            return mapped
          }),
        },
      }
      return campaignApi.create(payload)
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['campaigns'] })
      toast.success('Campaign created! Generating question pool...')
      navigate(`/admin/campaigns/${data.id}`)
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create campaign'
      toast.error(msg)
    },
  })

  const canNext = () => {
    switch (step) {
      case 0: return form.name && form.role && form.jobDescription.length >= 100
      case 1: return form.rounds.length >= 1
      case 2: return form.rounds.every(r => r.timeLimitMinutes && r.timeLimitMinutes > 0)
      case 3: return !hasInterviewRound || !!form.interviewMode
      case 4: return true
      case 5: return true
      default: return false
    }
  }

  const stepProps = { form, update }

  return (
    <div className="fade-in" style={{ maxWidth: '820px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/campaigns')}
          style={{ marginBottom: '12px' }}>
          <ChevronLeft size={15} /> Back to Campaigns
        </button>
        <h1 style={{ fontSize: '1.6rem', marginBottom: '4px' }}>Create Campaign</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Configure your hiring pipeline step by step
        </p>
      </div>

      {/* Wizard Steps Indicator */}
      <div className="wizard-steps" style={{ marginBottom: '32px' }}>
        {STEPS.map((s, i) => (
          <div key={i} className="wizard-step" style={{ display: 'flex', alignItems: 'center' }}>
            <div className="wizard-step-info">
              <div className={`wizard-step-circle ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                {i < step ? <Check size={14} /> : s.short}
              </div>
              <div className={`wizard-step-label ${i < step ? 'done' : i === step ? 'active' : ''}`}>
                {s.label}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`wizard-connector ${i < step ? 'done' : ''}`}
                style={{ margin: '0 4px', marginTop: '-16px' }} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="card slide-up" key={step}>
        {step === 0 && <Step1Meta {...stepProps} />}
        {step === 1 && <Step2Pipeline {...stepProps} />}
        {step === 2 && <Step3RoundConfig {...stepProps} />}
        {step === 3 && <Step4InterviewConfig {...stepProps} hasInterviewRound={hasInterviewRound} />}
        {step === 4 && <Step5Proctoring {...stepProps} />}
        {step === 5 && <Step6Review {...stepProps} onSubmit={() => submit()} isSubmitting={isPending} />}
      </div>

      {/* Navigation */}
      {step < 5 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <button className="btn btn-secondary" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
            <ChevronLeft size={16} /> Previous
          </button>
          <button className="btn btn-primary" onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
