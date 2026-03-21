import { Check, Plus } from 'lucide-react'

interface TopicPickerProps {
  groups: Record<string, string[]>
  selected: string[]
  onChange: (selected: string[]) => void
}

export default function TopicPicker({ groups, selected, onChange }: TopicPickerProps) {
  const toggleTopic = (topic: string) => {
    if (selected.includes(topic)) {
      onChange(selected.filter(t => t !== topic))
    } else {
      onChange([...selected, topic])
    }
  }

  const selectGroup = (groupTopics: string[]) => {
    const next = Array.from(new Set([...selected, ...groupTopics]))
    onChange(next)
  }

  const clearGroup = (groupTopics: string[]) => {
    onChange(selected.filter(t => !groupTopics.includes(t)))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {Object.entries(groups).map(([groupName, topics]) => (
        <div key={groupName}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {groupName}
            </h4>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                type="button" 
                className="btn btn-ghost btn-xs" 
                onClick={() => selectGroup(topics)}
                style={{ fontSize: '0.7rem' }}
              >
                Select All
              </button>
              <button 
                type="button" 
                className="btn btn-ghost btn-xs" 
                onClick={() => clearGroup(topics)}
                style={{ fontSize: '0.7rem' }}
              >
                Clear
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {topics.map(topic => {
              const isSelected = selected.includes(topic)
              return (
                <button
                  key={topic}
                  type="button"
                  onClick={() => toggleTopic(topic)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: isSelected ? 'var(--orange-soft)' : 'var(--bg-elevated)',
                    border: isSelected ? '1px solid var(--orange)' : '1px solid var(--border)',
                    color: isSelected ? 'var(--orange)' : 'var(--text-muted)'
                  }}
                >
                  {isSelected ? <Check size={12} /> : <Plus size={12} />}
                  {topic}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

