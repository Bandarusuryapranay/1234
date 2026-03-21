import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, UserCheck, ArrowRight, Camera } from 'lucide-react'
import { ProctoringCamera } from '../../components/ProctoringCamera'
import { useAuthStore } from '../../store/authStore'
import { useQuery } from '@tanstack/react-query'
import { candidateApi } from '../../services/api.services'

export default function IdentityVerificationPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [enrolled, setEnrolled] = useState(false)

  const { data: profile } = useQuery({
    queryKey: ['candidate', 'profile'],
    queryFn: candidateApi.getProfile
  })

  useEffect(() => {
    if (profile?.faceDescriptor) {
      setEnrolled(true)
    }
  }, [profile])

  const handleEnrollComplete = () => {
    setEnrolled(true)
  }

  const handleContinue = () => {
    if (user?.mustChangePassword) {
      navigate('/force-change-password')
    } else {
      navigate('/candidate/resume-upload')
    }
  }

  if (!profile) return <div className="spinner" />

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--dark)',
      color: 'var(--cream)',
      padding: '20px'
    }}>
      <div className="card fade-in" style={{ maxWidth: '800px', width: '100%', padding: '40px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <UserCheck size={48} color="var(--orange)" style={{ margin: '0 auto 16px' }} />
          <h1>Identity <span style={{ color: 'var(--orange)' }}>Verification</span></h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            We need to verify your identity before you begin the assessment.
            Please ensure you are in a well-lit area and looking directly at the camera.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '40px', alignItems: 'start' }}>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ProctoringCamera
              candidateId={profile.id}
              sessionId="enrollment"
              referenceDescriptor={null} // We are enrolling
              onEnrollComplete={handleEnrollComplete}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card" style={{ background: 'var(--bg-elevated)', border: enrolled ? '1px solid var(--green-dark)' : '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', background: enrolled ? 'var(--green-dark)' : 'var(--dark)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {enrolled ? <ShieldCheck size={18} color="#fff" /> : <span style={{ fontWeight: 700 }}>1</span>}
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>Biometric Enrollment</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Capture your face photo to create a secure biometric profile for proctoring.
                  </p>
                </div>
              </div>
            </div>

            <div className="card" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', opacity: enrolled ? 1 : 0.5 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', background: 'var(--dark)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <span style={{ fontWeight: 700 }}>2</span>
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>Proceed to Assessment</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Once verified, you will move to the resume upload and candidate lobby.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '14px', fontSize: '1rem', opacity: enrolled ? 1 : 0.6 }}
                disabled={!enrolled}
                onClick={handleContinue}
              >
                Continue <ArrowRight size={18} />
              </button>
              {!enrolled && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px' }}>
                  Please use the "Verify Identity" button on the left to proceed.
                </p>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '32px', padding: '16px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Camera size={14} color="var(--orange)" />
            Privacy Note: Your facial biometric data is encrypted and used solely for identity verification during this assessment session.
          </p>
        </div>
      </div>
    </div>
  )
}
