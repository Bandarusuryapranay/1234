import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { candidateApi } from '../../services/api.services'
import MCQRound from './MCQRound'
import CodingRound from './CodingRound'
import InterviewRound from './InterviewRound'
import LiveCodingRound from './LiveCodingRound'
import MixedRound from './MixedRound'

export default function RoundDispatcher() {
  const { roundId } = useParams()
  
  const { data: profile, isLoading } = useQuery({
    queryKey: ['candidate', 'profile'],
    queryFn: candidateApi.getProfile,
  })

  if (isLoading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}><div className="spinner" /></div>
  
  const round = profile?.rounds?.find((r: any) => r.id === roundId)
  
  if (!round) return <div style={{ padding: '40px', color: 'var(--cream)' }}>Round not found.</div>

  if (round.roundType === 'MCQ') return <MCQRound />
  if (round.roundType === 'CODING') return <CodingRound />
  if (round.roundType === 'INTERVIEW') {
    if (round.interviewMode === 'LIVE_CODING') return <LiveCodingRound />
    return <InterviewRound />
  }
  if (round.roundType === 'MIXED') return <MixedRound />
  
  return <div style={{ padding: '40px', color: 'var(--cream)' }}>Unknown round type: {round.roundType}</div>
}
