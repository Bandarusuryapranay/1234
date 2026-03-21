import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../../assets/Indium.png'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '../../services/api.services'
import { useAuthStore } from '../../store/authStore'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Mail, Lock, Zap } from 'lucide-react'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async ({ email, password }: FormData) => {
    setLoading(true)
    try {
      const data = await authApi.login(email, password)
      setAuth(data.user, data.accessToken, data.refreshToken)
      toast.success(`Welcome back, ${data.user.firstName}!`)
      if (data.user.mustChangePassword) {
        navigate('/force-change-password')
      } else if (data.user.role === 'ADMIN') {
        navigate('/admin/dashboard')
      } else if (data.user.role === 'RECRUITER') {
        navigate('/recruiter/dashboard')
      } else if (data.user.role === 'CANDIDATE') {
        navigate('/candidate/permissions')
      } else {
        navigate('/')
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Login failed. Check credentials.'
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
          radial-gradient(ellipse 60% 50% at 20% 50%, rgba(251,133,30,0.08) 0%, transparent 70%),
          radial-gradient(ellipse 50% 60% at 80% 50%, rgba(35,151,156,0.07) 0%, transparent 70%),
          var(--bg-base)
        `,
        padding: '20px',
      }}
    >
      <div className="fade-in" style={{ width: '100%', maxWidth: '420px' }}>

        {/* ── Logo & Branding ─────────────────────────── */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '12px 24px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <img
              src={logo}
              alt="Logo"
              style={{ height: '50%', width: '50%', objectFit: 'contain', display: 'block' }}
            />
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '6px', color: 'var(--cream)' }}>
            {import.meta.env.VITE_APP_NAME}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            AI-Powered Proctoring Interview Platform
          </p>
        </div>

        {/* ── Login Card ──────────────────────────────── */}
        <div
          className="card"
          style={{
            border: '1px solid rgba(251,133,30,0.2)',
            background: 'var(--bg-card)',
          }}
        >
          {/* Card header stripe */}
          <div style={{
            height: '3px',
            background: 'linear-gradient(90deg, #FB851E, #FB371E, #23979C)',
            margin: '-24px -24px 24px',
            borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          }} />

          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '4px', color: 'var(--cream)' }}>
            Sign In
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', marginBottom: '24px' }}>
            Enter your credentials to access the platform
          </p>

          <form
            onSubmit={handleSubmit(onSubmit)}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-icon-wrap">
                <Mail className="input-icon" size={16} />
                <input
                  {...register('email')}
                  type="email"
                  className={`form-input ${errors.email ? 'input-error' : ''}`}
                  placeholder="admin@company.com"
                  autoComplete="email"
                />
              </div>
              {errors.email && <span className="form-error">{errors.email.message}</span>}
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute', left: '12px', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-muted)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'input-error' : ''}`}
                  placeholder="Your password"
                  style={{ paddingLeft: '38px', paddingRight: '42px' }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                    padding: '2px',
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span className="form-error">{errors.password.message}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ marginTop: '8px', width: '100%', justifyContent: 'center' }}
            >
              {loading ? (
                <><div className="spinner spinner-sm" />Signing in...</>
              ) : (
                <><Zap size={17} />Sign In</>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center', color: 'var(--text-muted)',
          fontSize: '0.74rem', marginTop: '20px', lineHeight: 1.6,
        }}>
          Secured by SmartHire AI · All sessions are monitored & recorded
        </p>
      </div>
    </div>
  )
}
