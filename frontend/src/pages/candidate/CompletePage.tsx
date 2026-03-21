import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, Clock } from 'lucide-react'

export default function CompletePage() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Attempt completion might transition here with `pendingReview=true` in state
  const pendingReview = location.state?.pendingReview || false
  
  return (
    <div style={{ minHeight: '100vh', background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="card fade-in" style={{ maxWidth: '500px', width: '100%', textAlign: 'center', padding: '40px' }}>
        
        {!pendingReview ? (
          <>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--green-soft)', color: 'var(--green-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <CheckCircle size={40} />
            </div>
            <h1 style={{ color: 'var(--cream)', fontSize: '1.8rem', marginBottom: '16px' }}>All Rounds Complete!</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '32px' }}>
              🎉 Congratulations! You have successfully completed all your assessment rounds. Your recruiter will review your results and be in touch soon.
            </p>
          </>
        ) : (
          <>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--orange-soft)', color: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Clock size={40} />
            </div>
            <h1 style={{ color: 'var(--cream)', fontSize: '1.8rem', marginBottom: '16px' }}>Assessment Complete</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '32px' }}>
              Your assessment is complete. You did not meet the pass mark for one round, but your results have been sent to your recruiter for manual review. They will reach out to you with the next steps.
            </p>
          </>
        )}

        <button className="btn btn-outline" style={{ width: '100%' }} onClick={() => navigate('/login')}>
          Return to Hub
        </button>
      </div>
    </div>
  )
}
