import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../services/api.services'
import { User, Mail, Briefcase, Camera, Lock, Eye, EyeOff, ShieldCheck, Sun, Moon } from 'lucide-react'
import toast from 'react-hot-toast'
import { useThemeStore } from '../../store/themeStore'

export default function RecruiterProfilePage() {
  const { user, clearAuth } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const navigate = useNavigate()

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showPasswords, setShowPasswords] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase() : 'RC'

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (passwords.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (!/[A-Z]/.test(passwords.newPassword)) {
      toast.error('Password must have at least one uppercase letter')
      return
    }
    if (!/[0-9]/.test(passwords.newPassword)) {
      toast.error('Password must have at least one number')
      return
    }
    if (passwords.currentPassword === passwords.newPassword) {
      toast.error('New password must differ from your current password')
      return
    }

    setIsChangingPassword(true)
    try {
      await authApi.changePassword(passwords.currentPassword, passwords.newPassword)
      toast.success('Password changed! Please log in again.')
      clearAuth()
      navigate('/login')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to change password'
      toast.error(msg)
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="fade-in" style={{ maxWidth: '820px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ marginBottom: '4px' }}>
          <span style={{ color: 'var(--orange)' }}>My</span> Profile
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage your account info and security settings.</p>
      </div>

      {/* Profile Card */}
      <div className="card" style={{ padding: '32px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '110px', height: '110px', borderRadius: '50%',
              background: 'var(--grad-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.2rem', fontWeight: 800, color: '#fff',
              boxShadow: '0 8px 24px rgba(251,133,30,0.3)',
              position: 'relative',
            }}>
              {initials}
              <button
                className="btn btn-icon btn-sm"
                style={{
                  position: 'absolute', bottom: '-2px', right: '-2px',
                  background: 'var(--bg-surface)', border: '2px solid var(--bg-base)',
                  borderRadius: '50%', width: '32px', height: '32px',
                  color: 'var(--text-secondary)',
                }}
                title="Change avatar (coming soon)"
              >
                <Camera size={14} />
              </button>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{user?.firstName} {user?.lastName}</div>
              <div style={{
                display: 'inline-block', marginTop: '6px',
                background: 'var(--orange-soft)', color: 'var(--orange)',
                borderRadius: '12px', padding: '2px 12px',
                fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
              }}>
                {user?.role}
              </div>
            </div>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', paddingBottom: '12px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>
              Account Information
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">First Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input className="form-input" style={{ paddingLeft: '38px', opacity: 0.75 }} value={user?.firstName || ''} readOnly />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                  <input className="form-input" style={{ paddingLeft: '38px', opacity: 0.75 }} value={user?.lastName || ''} readOnly />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input className="form-input" type="email" style={{ paddingLeft: '38px', opacity: 0.75 }} value={user?.email || ''} readOnly />
              </div>
              <div className="form-hint">To update your email, contact your system administrator.</div>
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input className="form-input" style={{ paddingLeft: '38px', opacity: 0.75 }} value="Recruiter" readOnly />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance Settings */}
      <div className="card" style={{ padding: '32px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {theme === 'dark' ? <Moon size={18} style={{ color: 'var(--orange)' }} /> : <Sun size={18} style={{ color: 'var(--orange)' }} />}
          Appearance Settings
        </h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)' }}>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{theme === 'dark' ? 'Dark' : 'Light'} Mode</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{theme === 'dark' ? 'Dark background with light text' : 'Light background with dark text'}</div>
          </div>
          <button 
            className="btn btn-outline btn-sm"
            onClick={toggleTheme}
            style={{ minWidth: '100px' }}
          >
            {theme === 'dark' ? <><Sun size={14} /> Switch to Light</> : <><Moon size={14} /> Switch to Dark</>}
          </button>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="card" style={{ padding: '32px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={18} style={{ color: 'var(--orange)' }} />
          Change Password
        </h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
          After changing your password, you will be logged out and must sign in again with your new credentials.
        </p>

        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '420px' }}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                type={showPasswords ? 'text' : 'password'}
                className="form-input"
                style={{ paddingLeft: '38px' }}
                placeholder="Enter current password"
                value={passwords.currentPassword}
                onChange={e => setPasswords(p => ({ ...p, currentPassword: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                type={showPasswords ? 'text' : 'password'}
                className="form-input"
                style={{ paddingLeft: '38px' }}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                value={passwords.newPassword}
                onChange={e => setPasswords(p => ({ ...p, newPassword: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                type={showPasswords ? 'text' : 'password'}
                className="form-input"
                style={{ paddingLeft: '38px' }}
                placeholder="Re-enter new password"
                value={passwords.confirmPassword}
                onChange={e => setPasswords(p => ({ ...p, confirmPassword: e.target.value }))}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '0.8rem',
              }}
            >
              {showPasswords ? <><EyeOff size={14} /> Hide</> : <><Eye size={14} /> Show passwords</>}
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isChangingPassword || !passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword}
            >
              {isChangingPassword ? <><div className="spinner spinner-sm" />Updating...</> : <>Update Password</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
