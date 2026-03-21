export function drawQuestions(questions: any[], count: number, cfg: any): any[] {
  const byDifficulty = { EASY: [] as any[], MEDIUM: [] as any[], HARD: [] as any[] }
  for (const q of questions) byDifficulty[q.difficulty as keyof typeof byDifficulty]?.push(q)

  const easyCount   = Math.round(count * ((cfg.difficultyEasy   || 33) / 100))
  const mediumCount = Math.round(count * ((cfg.difficultyMedium || 34) / 100))
  const hardCount   = count - easyCount - mediumCount

  function pick(arr: any[], n: number) {
    return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
  }

  return [
    ...pick(byDifficulty.EASY,   easyCount),
    ...pick(byDifficulty.MEDIUM, mediumCount),
    ...pick(byDifficulty.HARD,   hardCount),
  ].sort(() => Math.random() - 0.5)
}
