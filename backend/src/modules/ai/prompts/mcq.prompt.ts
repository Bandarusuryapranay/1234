// ── Aptitude Topics ────────────────────────────────────────────
export const APTITUDE_TOPICS = {
  numerical:  ['Number System', 'HCF & LCM', 'Simplification', 'Squares & Cubes'],
  arithmetic: ['Percentage', 'Profit & Loss', 'Ratio & Proportion', 'Average', 'Mixtures & Alligation'],
  time_based: ['Speed, Distance & Time', 'Time & Work', 'Pipes & Cisterns'],
  data:       ['Data Interpretation', 'Data Sufficiency'],
  logical:    ['Number Series', 'Letter Series', 'Syllogisms', 'Blood Relations', 'Coding-Decoding', 'Direction Sense', 'Seating Arrangement'],
  verbal:     ['Reading Comprehension', 'Sentence Completion', 'Analogies'],
}

export type AptitudeTopicKey = keyof typeof APTITUDE_TOPICS

// ── JD-Based MCQ Prompt ────────────────────────────────────────
export function mcqPrompt(jd: string, role: string, cfg: any): string {
  const total  = Math.ceil((cfg.totalQuestions || 20) * 2.5)
  const easy   = Math.round(total * ((cfg.difficultyEasy   || 40) / 100))
  const medium = Math.round(total * ((cfg.difficultyMedium || 40) / 100))
  const hard   = total - easy - medium

  return `You are an expert technical interviewer generating MCQs for a ${role} position.

JOB DESCRIPTION:
${jd}

Generate exactly ${total} multiple choice questions: ${easy} EASY, ${medium} MEDIUM, ${hard} HARD.

Rules:
- Every question must test a skill, technology, or concept explicitly mentioned in the JD
- 4 options per question, exactly 1 correct answer
- Include a brief explanation for the correct answer
- Tag each question with the JD skill it tests (e.g. "React hooks", "SQL joins", "System design")
- Questions must be unique — no repetition
- EASY: fundamental concepts and definitions
- MEDIUM: applied knowledge with edge cases
- HARD: deep expertise, architecture decisions, tricky scenarios

Respond ONLY with valid JSON:
{
  "questions": [
    {
      "type": "MCQ",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "topicTag": "string",
      "stem": "question text",
      "options": [{ "id": "A", "text": "...", "isCorrect": false }, { "id": "B", "text": "...", "isCorrect": true }, { "id": "C", "text": "...", "isCorrect": false }, { "id": "D", "text": "...", "isCorrect": false }],
      "explanation": "why the correct answer is correct",
      "marksAwarded": ${cfg.marksPerQuestion || 1}
    }
  ]
}`
}

// ── Aptitude MCQ Prompt ────────────────────────────────────────
export function aptitudePrompt(cfg: any): string {
  const total      = Math.ceil((cfg.totalQuestions || 20) * 2.5)
  const easy       = Math.round(total * ((cfg.difficultyEasy   || 40) / 100))
  const medium     = Math.round(total * ((cfg.difficultyMedium || 40) / 100))
  const hard       = total - easy - medium
  const marks      = cfg.marksPerQuestion || 1
  const hasTopics  = cfg.aptitudeTopics?.length > 0

  // Build topic instruction
  let topicInstruction = ''
  if (hasTopics) {
    const selected: string[] = cfg.aptitudeTopics
    topicInstruction = `
Focus ONLY on these selected aptitude topics (distribute questions evenly across them):
${selected.map((t: string) => `- ${t}`).join('\n')}
`
  } else {
    topicInstruction = `
Cover a balanced mix of these aptitude areas:
- Numerical: Number System, Percentage, Profit & Loss, Ratio & Proportion, Average
- Time-based: Speed Distance Time, Time & Work, Pipes & Cisterns  
- Logical: Number Series, Syllogisms, Blood Relations, Coding-Decoding, Seating Arrangement
- Data: Data Interpretation tables and charts
`
  }

  return `You are an expert aptitude test designer for corporate recruitment assessments.

Generate exactly ${total} aptitude MCQs: ${easy} EASY, ${medium} MEDIUM, ${hard} HARD.
${topicInstruction}
Rules:
- EASY: straightforward formula application, single-step calculations
- MEDIUM: two to three step problems, moderate complexity
- HARD: multi-step complex problems, tricky conditions, speed under pressure
- Every question must have exactly 4 options with exactly 1 correct answer
- Include a clear step-by-step explanation showing how to solve it
- Questions must be self-contained — no external data needed
- Use realistic numbers, not overly complex arithmetic
- DO NOT generate technical IT questions — pure aptitude only
- Vary question formats: word problems, table-based, series-based

Respond ONLY with valid JSON:
{
  "questions": [
    {
      "type": "MCQ",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "topicTag": "exact topic name e.g. Speed Distance Time",
      "stem": "full question text with all necessary data",
      "options": [{ "id": "A", "text": "...", "isCorrect": false }, { "id": "B", "text": "...", "isCorrect": true }, { "id": "C", "text": "...", "isCorrect": false }, { "id": "D", "text": "...", "isCorrect": false }],
      "explanation": "step by step solution showing working",
      "marksAwarded": ${marks}
    }
  ]
}`
}