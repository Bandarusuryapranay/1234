import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { candidateApi } from '../../services/api.services'
import MCQRound        from './MCQRound'
import CodingRound     from './CodingRound'
import InterviewRound  from './InterviewRound'
import LiveCodingRound from './LiveCodingRound'
import MixedRound      from './MixedRound'

export default function RoundDispatcher() {
  const { roundId } = useParams<{ roundId: string }>()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['candidate', 'profile'],
    queryFn:  candidateApi.getProfile,
  })

  if (isLoading) {
    return (
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'center',
        height:'60vh', flexDirection:'column', gap:16,
      }}>
        <div className="spinner spinner-lg" />
        <p style={{ color:'var(--text-secondary)', fontSize:'0.875rem' }}>Loading round...</p>
      </div>
    )
  }

  const round = profile?.rounds?.find((r: any) => r.id === roundId)

  if (!round) {
    return (
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'center',
        height:'60vh', flexDirection:'column', gap:12,
      }}>
        <div style={{ fontSize:'2.5rem' }}>🔍</div>
        <p style={{ color:'var(--text-secondary)', fontSize:'0.9rem' }}>
          Round not found. Please return to the lobby.
        </p>
      </div>
    )
  }

  // Route to correct round component
  if (round.roundType === 'MCQ')      return <MCQRound />
  if (round.roundType === 'CODING')   return <CodingRound />
  if (round.roundType === 'MIXED')    return <MixedRound />

  if (round.roundType === 'INTERVIEW') {
    if (round.interviewMode === 'LIVE_CODING') return <LiveCodingRound />
    return <InterviewRound />
  }

  return (
    <div style={{ padding:40, color:'var(--text-secondary)', textAlign:'center' }}>
      Unknown round type: <strong>{round.roundType}</strong>
    </div>
  )
}