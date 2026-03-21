import type { CampaignFormData, Round } from '../../pages/admin/CreateCampaignPage'
import { Settings, Tag } from 'lucide-react'

interface Props {
  form: CampaignFormData
  update: (patch: Partial<CampaignFormData>) => void
}

const APTITUDE_TOPICS = [
  'Numerical', 'Percentage', 'Time & Speed', 'Logical Reasoning', 'Data Interpretation', 'Verbal'
]
const DSA_TOPICS = [
  'Arrays', 'Strings', 'Linked List', 'Trees', 'Graphs', 'Dynamic Programming',
  'Sorting', 'Stack & Queue', 'Math & Bit Manipulation'
]
const ALL_LANGUAGES = ['JavaScript', 'Python', 'Java', 'C++', 'Go', 'TypeScript']

function DiffBar({ easy, medium, hard }: { easy: number; medium: number; hard: number }) {
  return (
    <div style={{ marginTop: '8px' }}>
      <div className="diff-bars">
        <div className="diff-bar-easy" style={{ width: `${easy}%` }} />
        <div className="diff-bar-medium" style={{ width: `${medium}%` }} />
        <div className="diff-bar-hard" style={{ width: `${hard}%` }} />
      </div>
      <div className="diff-labels">
        <div className="diff-label" style={{ color: 'var(--green-dark)' }}>
          <span>{easy}%</span>Easy
        </div>
        <div className="diff-label" style={{ color: '#a88f00' }}>
          <span>{medium}%</span>Medium
        </div>
        <div className="diff-label" style={{ color: 'var(--red)' }}>
          <span>{hard}%</span>Hard
        </div>
      </div>
    </div>
  )
}

function TopicPicker({ selected, options, onChange }: {
  selected: string[]; options: string[]; onChange: (t: string[]) => void
}) {
  const toggle = (topic: string) => {
    onChange(selected.includes(topic) ? selected.filter(t => t !== topic) : [...selected, topic])
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
      {options.map(t => (
        <button
          key={t} type="button"
          onClick={() => toggle(t)}
          className={`btn btn-sm ${selected.includes(t) ? 'btn-primary' : 'btn-outline'}`}
          style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '20px' }}
        >
          <Tag size={11} /> {t}
        </button>
      ))}
    </div>
  )
}

function RoundConfig({
  round,
  onChange,
}: { round: Round; onChange: (r: Round) => void }) {
  const set = (patch: Partial<Round>) => onChange({ ...round, ...patch })
  const totalDiff = (round.difficultyEasy ?? 0) + (round.difficultyMedium ?? 0) + (round.difficultyHard ?? 0)

  const isMCQ = round.roundType === 'MCQ'
  const isCoding = round.roundType === 'CODING'
  const isInterview = round.roundType === 'INTERVIEW'

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '18px',
      marginBottom: '14px',
    }}>
      {/* Round header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span className={`round-badge ${round.roundType}`}>{round.roundType}</span>
        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Round {round.order}</span>
      </div>

      {/* ── Common fields grid ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
        {/* Question / Problem count */}
        {(isMCQ || isInterview) && (
          <div className="form-group">
            <label className="form-label">
              {isMCQ ? 'Total Questions' : 'Question Count'}
              <span className="form-required">*</span>
            </label>
            <input
              type="number" className="form-input" min={1} max={100}
              value={round.totalQuestions || ''}
              onChange={e => set({ totalQuestions: Number(e.target.value) })}
              placeholder="e.g. 20"
            />
            {isMCQ && (
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Pool = {Math.ceil((round.totalQuestions || 0) * 2.5)} questions (2.5×)
              </span>
            )}
            {isInterview && (
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                Pool = {Math.ceil((round.totalQuestions || 0) * 1.5)} questions (1.5×)
              </span>
            )}
          </div>
        )}

        {isCoding && (
          <div className="form-group">
            <label className="form-label">Problem Count <span className="form-required">*</span></label>
            <input
              type="number" className="form-input" min={1} max={20}
              value={round.totalQuestions || ''}
              onChange={e => set({ totalQuestions: Number(e.target.value) })}
              placeholder="e.g. 3"
            />
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
              Pool = {Math.ceil((round.totalQuestions || 0) * 1.5)} problems (1.5×)
            </span>
          </div>
        )}

        {/* Time limit */}
        <div className="form-group">
          <label className="form-label">Time Limit (mins) <span className="form-required">*</span></label>
          <input
            type="number" className="form-input" min={5}
            value={round.timeLimitMinutes || ''}
            onChange={e => set({ timeLimitMinutes: Number(e.target.value) })}
            placeholder="e.g. 30"
          />
        </div>

        {/* Pass mark */}
        <div className="form-group">
          <label className="form-label">Pass Mark % <span className="form-required">*</span></label>
          <input
            type="number" className="form-input" min={0} max={100}
            value={round.passMarkPercent || ''}
            onChange={e => set({ passMarkPercent: Number(e.target.value) })}
            placeholder="e.g. 60"
          />
        </div>

        {/* Fail action */}
        <div className="form-group">
          <label className="form-label">Fail Action</label>
          <select
            className="form-select"
            value={round.failAction || 'MANUAL_REVIEW'}
            onChange={e => set({ failAction: e.target.value })}
          >
            <option value="MANUAL_REVIEW">Manual Review</option>
            <option value="AUTO_REJECT">Auto Reject</option>
          </select>
        </div>
      </div>

      {/* ── MCQ-specific ──────────────────────────────── */}
      {isMCQ && (
        <div style={{ marginTop: '18px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <label className="form-label" style={{ marginBottom: '10px', display: 'block', fontWeight: 600 }}>
            Question Mode
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            {(['JD_BASED', 'APTITUDE'] as const).map(mode => (
              <button
                key={mode} type="button"
                className={`btn btn-sm ${(round.questionMode || 'JD_BASED') === mode ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => set({ questionMode: mode, topicTags: mode === 'JD_BASED' ? [] : round.topicTags })}
              >
                {mode === 'JD_BASED' ? '📄 JD-Based' : '🧠 Aptitude'}
              </button>
            ))}
          </div>

          {round.questionMode === 'APTITUDE' && (
            <div style={{ marginBottom: '14px' }}>
              <label className="form-label">Select Topics</label>
              <TopicPicker
                selected={round.topicTags || []}
                options={APTITUDE_TOPICS}
                onChange={t => set({ topicTags: t })}
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="form-group">
              <label className="form-label">Marks per Question</label>
              <input type="number" className="form-input" min={0.5} step={0.5}
                value={round.marksPerQuestion ?? 1}
                onChange={e => set({ marksPerQuestion: Number(e.target.value) })}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            <label className="toggle-wrap">
              <span className="toggle">
                <input type="checkbox" checked={!!round.shuffleQuestions}
                  onChange={e => set({ shuffleQuestions: e.target.checked })} />
                <span className="toggle-slider" />
              </span>
              <span className="toggle-label">Shuffle Questions</span>
            </label>
            <label className="toggle-wrap">
              <span className="toggle">
                <input type="checkbox" checked={!!round.negativeMarking}
                  onChange={e => set({ negativeMarking: e.target.checked })} />
                <span className="toggle-slider" />
              </span>
              <span className="toggle-label">Negative Marking</span>
            </label>
          </div>

          {round.negativeMarking && (
            <div className="form-group" style={{ marginTop: '12px', maxWidth: '200px' }}>
              <label className="form-label">Penalty per Wrong Answer</label>
              <input type="number" className="form-input" min={0} step={0.25}
                value={round.penaltyPerWrong ?? 0.25}
                onChange={e => set({ penaltyPerWrong: Number(e.target.value) })}
              />
            </div>
          )}
        </div>
      )}

      {/* ── CODING-specific ──────────────────────────────── */}
      {isCoding && (
        <div style={{ marginTop: '18px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <label className="form-label" style={{ marginBottom: '10px', display: 'block', fontWeight: 600 }}>
            Question Mode
          </label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            {(['JD_BASED', 'DSA'] as const).map(mode => (
              <button
                key={mode} type="button"
                className={`btn btn-sm ${(round.questionMode || 'JD_BASED') === mode ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => set({ questionMode: mode, topicTags: mode === 'JD_BASED' ? [] : round.topicTags })}
              >
                {mode === 'JD_BASED' ? '📄 JD-Based' : '🧮 DSA'}
              </button>
            ))}
          </div>

          {round.questionMode === 'DSA' && (
            <div style={{ marginBottom: '14px' }}>
              <label className="form-label">Select Topics</label>
              <TopicPicker
                selected={round.topicTags || []}
                options={DSA_TOPICS}
                onChange={t => set({ topicTags: t })}
              />
            </div>
          )}

          <div style={{ marginTop: '12px' }}>
            <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Allowed Languages</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {ALL_LANGUAGES.map(lang => {
                const langs = round.allowedLanguages || ALL_LANGUAGES
                const checked = langs.includes(lang)
                return (
                  <label key={lang} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '0.82rem', cursor: 'pointer',
                    padding: '4px 10px', borderRadius: '6px',
                    background: checked ? 'rgba(251,133,30,0.12)' : 'var(--bg-elevated)',
                    border: `1px solid ${checked ? 'var(--primary)' : 'var(--border)'}`,
                  }}>
                    <input type="checkbox" checked={checked}
                      onChange={() => {
                        const next = checked ? langs.filter(l => l !== lang) : [...langs, lang]
                        set({ allowedLanguages: next })
                      }}
                    />
                    {lang}
                  </label>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── INTERVIEW-specific ──────────────────────────── */}
      {isInterview && (
        <div style={{ marginTop: '18px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Interview Mode</label>
              <select className="form-select"
                value={round.interviewMode || 'TEXT'}
                onChange={e => set({ interviewMode: e.target.value as any })}
              >
                <option value="TEXT">Text (Type Answers)</option>
                <option value="AUDIO">Audio (Speak Answers)</option>
                <option value="LIVE_CODING">Live Coding (Code + Explain)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Depth</label>
              <select className="form-select"
                value={round.depth || 'DEEP'}
                onChange={e => set({ depth: e.target.value as any })}
              >
                <option value="SHALLOW">Shallow (Quick Answers)</option>
                <option value="DEEP">Deep (Scenario-Based)</option>
              </select>
            </div>
          </div>

          {/* Resume split slider */}
          <div className="form-group" style={{ marginTop: '14px' }}>
            <label className="form-label">
              Resume Split: {round.resumeSplitPercent ?? 0}% resume + {100 - (round.resumeSplitPercent ?? 0)}% JD
            </label>
            <input type="range" min={0} max={100} step={10}
              value={round.resumeSplitPercent ?? 0}
              onChange={e => set({ resumeSplitPercent: Number(e.target.value) })}
              style={{ width: '100%', accentColor: 'var(--primary)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <span>All JD-based</span>
              <span>All resume-based</span>
            </div>
          </div>

          {/* Allowed languages for LIVE_CODING */}
          {round.interviewMode === 'LIVE_CODING' && (
            <div style={{ marginTop: '14px' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Allowed Languages</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['JavaScript', 'Python', 'Java', 'C++'].map(lang => {
                  const langs = round.allowedLanguages || ['JavaScript', 'Python', 'Java', 'C++']
                  const checked = langs.includes(lang)
                  return (
                    <label key={lang} style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      fontSize: '0.82rem', cursor: 'pointer',
                      padding: '4px 10px', borderRadius: '6px',
                      background: checked ? 'rgba(251,133,30,0.12)' : 'var(--bg-elevated)',
                      border: `1px solid ${checked ? 'var(--primary)' : 'var(--border)'}`,
                    }}>
                      <input type="checkbox" checked={checked}
                        onChange={() => {
                          const next = checked ? langs.filter(l => l !== lang) : [...langs, lang]
                          set({ allowedLanguages: next })
                        }}
                      />
                      {lang}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Difficulty Distribution (MCQ & CODING) ──────── */}
      {(isMCQ || isCoding) && (
        <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <label className="form-label" style={{ marginBottom: '10px', display: 'block' }}>
            Difficulty Distribution
            {totalDiff !== 100 && (
              <span style={{ color: 'var(--red)', marginLeft: '8px', fontSize: '0.72rem' }}>
                Must sum to 100% (currently {totalDiff}%)
              </span>
            )}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {(['Easy', 'Medium', 'Hard'] as const).map((d) => {
              const key = `difficulty${d}` as keyof Round
              return (
                <div key={d} className="form-group">
                  <label className="form-label" style={{
                    color: d === 'Easy' ? 'var(--green-dark)' : d === 'Medium' ? '#a88f00' : 'var(--red)'
                  }}>{d} %</label>
                  <input
                    type="number" className="form-input" min={0} max={100}
                    value={(round[key] as number) ?? ''}
                    onChange={e => set({ [key]: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
              )
            })}
          </div>
          <DiffBar
            easy={round.difficultyEasy ?? 0}
            medium={round.difficultyMedium ?? 0}
            hard={round.difficultyHard ?? 0}
          />
        </div>
      )}

      {/* MIXED sub-slices */}
      {round.roundType === 'MIXED' && (
        <div style={{ marginTop: '14px' }}>
          <label className="form-label" style={{ marginBottom: '10px', display: 'block' }}>Sub-slice Counts</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            {(['MCQ', 'CODING', 'INTERVIEW'] as const).map(type => (
              <div key={type} className="form-group">
                <label className="form-label">
                  <span className={`round-badge ${type}`} style={{ marginRight: '6px' }}>{type}</span> Count
                </label>
                <input
                  type="number" className="form-input" min={0}
                  placeholder="0"
                  onChange={e => {
                    const slices = [...(round.slices || [])]
                    const idx = slices.findIndex(s => s.type === type)
                    if (idx >= 0) slices[idx] = { ...slices[idx], count: Number(e.target.value) }
                    else slices.push({ type, count: Number(e.target.value) })
                    set({ slices })
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Step3RoundConfig({ form, update }: Props) {
  const updateRound = (round: Round) => {
    update({ rounds: form.rounds.map(r => r.id === round.id ? round : r) })
  }

  return (
    <div>
      <div style={{ marginBottom: '22px' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={18} style={{ color: 'var(--orange)' }} />
          Per-Round Configuration
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Configure questions, time limits, difficulty, and question mode for each round
        </p>
      </div>

      {form.rounds.map((round, index) => (
        <RoundConfig key={round.id || `round-config-${index}`} round={round} onChange={updateRound} />
      ))}
    </div>
  )
}
