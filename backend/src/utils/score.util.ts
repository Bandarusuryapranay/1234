export function calculateMCQScore(p: {
  isCorrect: boolean, attempted: boolean,
  marksPerQuestion: number, negativeMarking: boolean, penaltyPerWrong: number
}): number {
  if (!p.attempted) return 0
  if (p.isCorrect)  return p.marksPerQuestion
  return p.negativeMarking ? -p.penaltyPerWrong : 0
}

export function calculateCodingScore(passed: number, total: number): number {
  if (total === 0) return 0
  return parseFloat(((passed / total) * 10).toFixed(2))
}

export function calculatePassFail(score: number, maxScore: number, passMarkPercent: number): boolean {
  if (maxScore === 0) return false
  return (score / maxScore) * 100 >= passMarkPercent
}
