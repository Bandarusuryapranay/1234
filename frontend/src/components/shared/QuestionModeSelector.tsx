import { useState, useEffect } from 'react'
import { questionsApi } from '../../services/api.services'
import TopicPicker from './TopicPicker'

interface ModeSelectorProps {
  roundType: 'MCQ' | 'CODING' | 'INTERVIEW'
  value: any
  onChange: (val: any) => void
}

export default function QuestionModeSelector({ roundType, value, onChange }: ModeSelectorProps) {
  const [topics, setTopics] = useState<{ aptitude: any[], dsa: any[] }>({ aptitude: [], dsa: [] })

  useEffect(() => {
    if (roundType !== 'INTERVIEW') {
      questionsApi.getTopics().then(setTopics).catch(console.error)
    }
  }, [roundType])

  const type = value.type || 'JD_BASED'

  // ── MCQ ──────────────────────────────────────────────────────────
  if (roundType === 'MCQ') {
    const aptitudeGroups = topics.aptitude.reduce((acc, g) => ({ ...acc, [g.category]: g.topics }), {})
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--bg-elevated)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <button
            type="button"
            className={type === 'JD_BASED' ? 'btn btn-sm btn-orange' : 'btn btn-sm btn-ghost'}
            onClick={() => onChange({ ...value, type: 'JD_BASED' })}
          >
            JD-Based
          </button>
          <button
            type="button"
            className={type === 'APTITUDE' ? 'btn btn-sm btn-orange' : 'btn btn-sm btn-ghost'}
            onClick={() => onChange({ ...value, type: 'APTITUDE' })}
          >
            Aptitude
          </button>
        </div>

        {type === 'APTITUDE' && (
          <div className="card" style={{ padding: '20px', border: '1px solid var(--border)' }}>
            <TopicPicker
              groups={aptitudeGroups}
              selected={value.topics || []}
              onChange={(topics) => onChange({ ...value, topics })}
            />
          </div>
        )}
      </div>
    )
  }

  // ── CODING ───────────────────────────────────────────────────────
  if (roundType === 'CODING') {
    const dsaGroups = topics.dsa.reduce((acc, g) => ({ ...acc, [g.category]: g.topics }), {})

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--bg-elevated)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <button
            type="button"
            className={type === 'JD_BASED' ? 'btn btn-sm btn-teal' : 'btn btn-sm btn-ghost'}
            onClick={() => onChange({ ...value, type: 'JD_BASED' })}
          >
            JD-Based
          </button>
          <button
            type="button"
            className={type === 'DSA' ? 'btn btn-sm btn-teal' : 'btn btn-sm btn-ghost'}
            onClick={() => onChange({ ...value, type: 'DSA' })}
          >
            DSA
          </button>
        </div>

        {type === 'DSA' && (
          <div className="card" style={{ padding: '20px', border: '1px solid var(--border)' }}>
            <TopicPicker
              groups={dsaGroups}
              selected={value.topics || []}
              onChange={(topics) => onChange({ ...value, topics })}
            />
          </div>
        )}
      </div>
    )
  }

  // ── INTERVIEW ────────────────────────────────────────────────────
  if (roundType === 'INTERVIEW') {
    const mode = value.mode || 'TEXT'
    const resumeSplit = value.resumeSplit ?? 50
    const languages = value.languages || []

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="form-group">
          <label style={{ color: 'var(--text-secondary)' }}>Interview Mode</label>
          <select 
            className="form-select" 
            value={mode} 
            onChange={e => onChange({ ...value, mode: e.target.value })}
          >
            <option value="TEXT">Interactive Text Chat</option>
            <option value="AUDIO">Audio Q&A (Groq STT + GPT-4o)</option>
            <option value="LIVE_CODING">Live Coding + Audio Explanation</option>
          </select>
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label style={{ color: 'var(--text-secondary)' }}>Resume Split</label>
            <span style={{ fontWeight: 700, color: 'var(--purple)', fontSize: '0.9rem' }}>{resumeSplit}% Resume</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="10"
            value={resumeSplit}
            onChange={e => onChange({ ...value, resumeSplit: parseInt(e.target.value) })}
            style={{ width: '100%', accentColor: 'var(--purple)' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
             <span>Pure JD Focus</span>
             <span>Balanced</span>
             <span>Pure Resume Focus</span>
          </div>
        </div>

        {mode === 'LIVE_CODING' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
             <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Allowed Languages</label>
             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                {['javascript', 'python', 'java', 'cpp', 'csharp'].map(lang => (
                  <label key={lang} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={languages.includes(lang)}
                      onChange={e => {
                        const next = e.target.checked 
                          ? [...languages, lang]
                          : languages.filter((l: string) => l !== lang)
                        onChange({ ...value, languages: next })
                      }}
                      style={{ accentColor: 'var(--red)' }}
                    />
                    <span style={{ textTransform: 'capitalize' }}>{lang === 'cpp' ? 'C++' : lang === 'csharp' ? 'C#' : lang}</span>
                  </label>
                ))}
             </div>
          </div>
        )}
      </div>
    )
  }

  return null
}
