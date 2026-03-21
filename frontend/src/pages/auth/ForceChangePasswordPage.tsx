import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../../assets/Indium.png'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '../../services/api.services'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Lock, ShieldAlert } from 'lucide-react'

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
})

type FormData = z.infer<typeof schema>

export default function ForceChangePasswordPage() {
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // If user is not logged in or doesn't need to change password, redirect
  if (!user || !user.mustChangePassword) {
    navigate('/login')
    return null
  }

  const onSubmit = async ({ currentPassword, newPassword }: FormData) => {
    setLoading(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      toast.success('Password changed successfully! Please log in again.')
      clearAuth() // The backend blacklists the old token, so force re-login
      navigate('/login')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to change password.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `
          radial-gradient(ellipse 60% 50% at 20% 50%, rgba(251,55,30,0.08) 0%, transparent 70%),
          radial-gradient(ellipse 50% 60% at 80% 50%, rgba(35,151,156,0.07) 0%, transparent 70%),
          var(--bg-base)
        `,
        padding: '20px',
      }}
    >
      <div className="fade-in" style={{ width: '100%', maxWidth: '440px' }}>

        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            background: '#ffffff', borderRadius: '12px', padding: '12px 24px',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
          }}>
            <img src={logo} alt="Logo" style={{ height: '36px', width: 'auto', objectFit: 'contain', display: 'block' }} />
          </div>
        </div>

        <div className="card" style={{ border: '1px solid rgba(251,55,30,0.2)', padding: '32px 24px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--red)' }}>
            <ShieldAlert size={48} strokeWidth={1.5} />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: 'var(--cream)', textAlign: 'center' }}>
            Security Update Required
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '28px', textAlign: 'center', lineHeight: 1.5 }}>
            Hello {user.firstName}, your account requires a password change before you can access the dashboard.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div className="form-group">
              <label className="form-label">Temporary Password</label>
              <div className="input-icon-wrap">
                <Lock className="input-icon" size={16} />
                <input
                  {...register('currentPassword')}
                  type={showPass ? 'text' : 'password'}
                  className={`form-input ${errors.currentPassword ? 'input-error' : ''}`}
                  placeholder="Enter current password"
                />
              </div>
              {errors.currentPassword && <span className="form-error">{errors.currentPassword.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="input-icon-wrap">
                <Lock className="input-icon" size={16} />
                <input
                  {...register('newPassword')}
                  type={showPass ? 'text' : 'password'}
                  className={`form-input ${errors.newPassword ? 'input-error' : ''}`}
                  placeholder="Minimum 8 characters, 1 Uppercase, 1 Number"
                />
              </div>
              {errors.newPassword && <span className="form-error">{errors.newPassword.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div className="input-icon-wrap">
                <Lock className="input-icon" size={16} />
                <input
                  {...register('confirmPassword')}
                  type={showPass ? 'text' : 'password'}
                  className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
                  placeholder="Re-enter new password"
                />
              </div>
              {errors.confirmPassword && <span className="form-error">{errors.confirmPassword.message}</span>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginTop: '-8px' }}>
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem'
                }}
              >
                {showPass ? <><EyeOff size={14} /> Hide Passwords</> : <><Eye size={14} /> Show Passwords</>}
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ marginTop: '8px', width: '100%', justifyContent: 'center' }}
            >
              {loading ? (
                <><div className="spinner spinner-sm" />Updating...</>
              ) : (
                <>Update Password & Login</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
