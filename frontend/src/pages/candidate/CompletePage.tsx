import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, Clock, ArrowLeft } from 'lucide-react'

export default function CompletePage() {
  const navigate    = useNavigate()
  const location    = useLocation()
  const pendingReview = location.state?.pendingReview || false

  return (
    <div style={{
      minHeight:      '100vh',
      background:     'var(--bg-base)',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      padding:        20,
    }}>
      <div
        className="card fade-in"
        style={{ maxWidth:520, width:'100%', textAlign:'center', padding:'48px 40px' }}
      >

        {!pendingReview ? (
          <>
            {/* Success state */}
            <div style={{
              width:80, height:80, borderRadius:'50%',
              background:'var(--green-soft)',
              display:'flex', alignItems:'center', justifyContent:'center',
              margin:'0 auto 24px',
            }}>
              <CheckCircle size={40} color="var(--green-dark)" />
            </div>

            <h1 style={{ color:'var(--text-primary)', fontSize:'1.75rem', marginBottom:14 }}>
              All Rounds Complete!
            </h1>

            <p style={{ color:'var(--text-secondary)', fontSize:'0.95rem', lineHeight:1.7, marginBottom:32 }}>
              🎉 Congratulations! You have successfully completed all your assessment rounds.
              Your recruiter will review your results and be in touch soon.
            </p>

            <div style={{
              background:'var(--green-soft)', border:'1px solid rgba(134,254,144,0.3)',
              borderRadius:10, padding:'14px 20px', marginBottom:28,
              fontSize:'0.85rem', color:'var(--green-dark)',
            }}>
              Your scores have been submitted and your gap analysis is being generated.
            </div>
          </>
        ) : (
          <>
            {/* Pending review state */}
            <div style={{
              width:80, height:80, borderRadius:'50%',
              background:'var(--orange-soft)',
              display:'flex', alignItems:'center', justifyContent:'center',
              margin:'0 auto 24px',
            }}>
              <Clock size={40} color="var(--orange)" />
            </div>

            <h1 style={{ color:'var(--text-primary)', fontSize:'1.75rem', marginBottom:14 }}>
              Assessment Complete
            </h1>

            <p style={{ color:'var(--text-secondary)', fontSize:'0.95rem', lineHeight:1.7, marginBottom:32 }}>
              Your assessment is complete. You did not meet the required pass mark for one round,
              but your results have been sent to your recruiter for manual review. They will reach
              out with next steps.
            </p>

            <div style={{
              background:'var(--orange-soft)', border:'1px solid rgba(251,133,30,0.3)',
              borderRadius:10, padding:'14px 20px', marginBottom:28,
              fontSize:'0.85rem', color:'var(--orange-dark)',
            }}>
              A recruiter will review your results and decide whether to advance or close your application.
            </div>
          </>
        )}

        <button
          className="btn btn-outline"
          style={{ width:'100%', gap:8 }}
          onClick={() => navigate('/login')}
        >
          <ArrowLeft size={16} />
          Return to Login
        </button>

      </div>
    </div>
  )
}