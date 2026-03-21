import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { User, Mail, Briefcase, Camera } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user } = useAuthStore()
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    // Mock API call since there's no dedicated profile update endpoint yet
    await new Promise(r => setTimeout(r, 800))
    toast.success('Profile updated successfully')
    setIsSaving(false)
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'AD'

  return (
    <div className="fade-in max-w-content mx-auto" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '4px' }}>My Profile</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your personal information and preferences.</p>
      </div>

      <div className="card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          
          {/* Avatar Section */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '120px', height: '120px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--orange), #ff6b00)',
              color: 'var(--cream)', fontSize: '2.5rem', fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(251, 133, 30, 0.25)',
              position: 'relative'
            }}>
              {initials}
              <button className="btn btn-icon" style={{
                position: 'absolute', bottom: '0', right: '0',
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: '50%', width: '36px', height: '36px',
                color: 'var(--text)', boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
              }} title="Change avatar">
                <Camera size={16} />
              </button>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{user?.firstName} {user?.lastName}</div>
              <div style={{ color: 'var(--orange)', fontSize: '0.85rem', fontWeight: 600, marginTop: '4px' }}>
                {user?.role}
              </div>
            </div>
          </div>

          {/* Form Section */}
          <form style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '20px' }} onSubmit={handleSave}>
            
            <div className="grid-2" style={{ gap: '16px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">First Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    name="firstName"
                    className="form-input"
                    style={{ paddingLeft: '38px' }}
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Last Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    name="lastName"
                    className="form-input"
                    style={{ paddingLeft: '38px' }}
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Role</label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '38px', opacity: 0.7, background: 'var(--bg-hover)' }}
                  value={user?.role}
                  readOnly
                  disabled
                />
              </div>
              <div className="form-hint" style={{ marginTop: '6px' }}>Role can only be changed by system administrators.</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
              <button type="submit" className="btn btn-primary" disabled={isSaving}>
                {isSaving ? (
                  <><div className="spinner spinner-sm" style={{ borderTopColor: '#000' }} /> Saving...</>
                ) : 'Save Changes'}
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </div>
  )
}
