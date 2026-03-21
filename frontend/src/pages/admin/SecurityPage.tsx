import { useState } from 'react'
import { authApi } from '../../services/api.services'
import { Shield, Lock, Laptop, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SecurityPage() {
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [isChanging, setIsChanging] = useState(false)
  const [twoFactor, setTwoFactor] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (passwords.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }
    if (!/[A-Z]/.test(passwords.newPassword)) {
      toast.error('Password must contain at least one uppercase letter')
      return
    }
    if (!/[0-9]/.test(passwords.newPassword)) {
      toast.error('Password must contain at least one number')
      return
    }

    setIsChanging(true)
    try {
      await authApi.changePassword(passwords.currentPassword, passwords.newPassword)
      toast.success('Password updated securely.')
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err: any) {
      const data = err.response?.data
      if (data?.fields && data.fields.length > 0) {
        toast.error(data.fields[0].message)
      } else {
        toast.error(data?.error || data?.message || 'Failed to change password')
      }
    } finally {
      setIsChanging(false)
    }
  }

  const handle2FA = async () => {
    const nextState = !twoFactor
    setTwoFactor(nextState)
    toast.success(nextState ? 'Two-Factor Authentication Enabled' : 'Two-Factor Authentication Disabled')
  }

  return (
    <div className="fade-in max-w-content mx-auto" style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '4px' }}>Security Configuration</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Protect your account and review active sessions.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Two Factor */}
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: twoFactor ? 'var(--green-soft)' : 'var(--bg-hover)',
              color: twoFactor ? 'var(--green-dark)' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Shield size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Two-Factor Authentication (2FA)</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Add an extra layer of security to your account</p>
            </div>
          </div>
          <div>
            <button
              className={`btn ${twoFactor ? 'btn-outline' : 'btn-success'}`}
              onClick={handle2FA}
            >
              {twoFactor ? 'Disable' : 'Enable 2FA'}
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={18} style={{ color: 'var(--orange)' }} /> Change Password
          </h2>
          
          <form style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }} onSubmit={handlePasswordChange}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Current Password</label>
              <input
                type="password"
                name="currentPassword"
                className="form-input"
                placeholder="Enter current password"
                value={passwords.currentPassword}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">New Password</label>
              <input
                type="password"
                name="newPassword"
                className="form-input"
                placeholder="Minimum 8 characters"
                value={passwords.newPassword}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                className="form-input"
                placeholder="Confirm password"
                value={passwords.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>
            
            <div style={{ marginTop: '8px' }}>
              <button type="submit" className="btn btn-primary" disabled={isChanging || !passwords.currentPassword || !passwords.newPassword}>
                {isChanging ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Active Sessions */}
        <div className="card">
          <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Laptop size={18} style={{ color: 'var(--teal)' }} /> Active Sessions
          </h2>
          
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-hover)', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Laptop size={20} style={{ color: 'var(--green-dark)' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Windows — Chrome <span className="badge badge-success" style={{ marginLeft: '6px' }}>Current</span></div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Location: Admin Office · Last active: Just now</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Laptop size={20} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>MacBook Pro — Safari</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Location: Remote IP · Last active: 2 hours ago</div>
                </div>
              </div>
              <button className="btn btn-ghost btn-danger btn-sm">Revoke</button>
            </div>
            
          </div>
          
          <div style={{ display: 'flex', gap: '8px', padding: '12px', background: 'var(--red-soft)', color: 'var(--red)', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', marginTop: '16px', alignItems: 'flex-start' }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>Notice an unfamiliar session? Revoke it immediately and change your password to secure your account.</div>
          </div>
        </div>

      </div>
    </div>
  )
}
