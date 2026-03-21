import { useState } from 'react'
import { Bell, Moon, Sun, Languages, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import { useThemeStore } from '../../store/themeStore'

export default function SettingsPage() {
  const { theme, toggleTheme } = useThemeStore()
  
  const [settings, setSettings] = useState({
    emailAlerts: true,
    pushAlerts: false,
    language: 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  })

  const [isSaving, setIsSaving] = useState(false)

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise(r => setTimeout(r, 600))
    toast.success('Settings updated successfully')
    setIsSaving(false)
  }

  return (
    <div className="fade-in max-w-content mx-auto" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '4px' }}>System Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Configure global platform preferences and defaults.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Appearance & Locale */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {theme === 'dark' ? <Moon size={18} style={{ color: 'var(--orange)' }} /> : <Sun size={18} style={{ color: 'var(--orange)' }} />} 
            Theme Settings
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{theme === 'dark' ? 'Dark' : 'Light'} Mode</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{theme === 'dark' ? 'Dark background with light text' : 'Light background with dark text'}</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={theme === 'dark'}
                  onChange={toggleTheme}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--orange)' }}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Global Configuration */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={18} style={{ color: 'var(--teal)' }} /> Regional
          </h2>
          
          <div className="grid-2" style={{ gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Languages size={14} /> Language</label>
              <select name="language" className="form-input" value={settings.language} onChange={handleChange}>
                <option value="en">English (US)</option>
                <option value="en-gb">English (UK)</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Timezone</label>
              <select name="timezone" className="form-input" value={settings.timezone} onChange={handleChange}>
                <option value={settings.timezone}>{settings.timezone} (Automatic)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell size={18} style={{ color: 'var(--yellow-dark)' }} /> Notifications
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Email Alerts</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Receive summaries array and candidates completions</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={settings.emailAlerts}
                  onChange={() => handleToggle('emailAlerts')}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--orange)' }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Push Notifications</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Urgent real-time proctoring alerts</div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={settings.pushAlerts}
                  onChange={() => handleToggle('pushAlerts')}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--orange)' }}
                />
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
