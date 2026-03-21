import { useNavigate, useLocation } from 'react-router-dom'
import { ShieldAlert, AlertTriangle } from 'lucide-react'

export default function TerminatedPage() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Might receive type = 'proctoring' | 'failed' + reason
  const type = location.state?.type || 'proctoring'
  const reason = location.state?.reason || 'Unknown error. Your session was ended.'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="card fade-in" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', padding: '40px' }}>
        
        {type === 'proctoring' ? (
          <>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--red-soft)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <ShieldAlert size={40} />
            </div>
            <h1 style={{ color: 'var(--cream)', fontSize: '1.8rem', marginBottom: '16px' }}>Terminal Violation</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '32px' }}>
              Your session was ended due to repeated proctoring violations. Your recruiter has been notified of the incidents captured during your assessment.
            </p>
          </>
        ) : (
          <>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--orange-soft)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <AlertTriangle size={40} />
            </div>
            <h1 style={{ color: 'var(--cream)', fontSize: '1.8rem', marginBottom: '16px' }}>Assessment Did Not Pass</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '32px' }}>
              You did not meet the required pass mark for this round. {reason}
            </p>
          </>
        )}

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => navigate('/login')}>
          Return to Login
        </button>
      </div>
    </div>
  )
}
