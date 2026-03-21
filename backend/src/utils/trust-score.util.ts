export function computeTrustScore(p: {
  strikeCount: number, maxStrikes: number, terminated: boolean, avgScore: number
}): number {
  let score = 100
  score -= (p.strikeCount / p.maxStrikes) * 30  // up to -30 for strikes
  if (p.terminated) score -= 20                  // -20 for full termination
  if (p.avgScore < 40) score -= 10               // -10 for very low performance
  return Math.max(0, Math.min(100, Math.round(score)))
}
