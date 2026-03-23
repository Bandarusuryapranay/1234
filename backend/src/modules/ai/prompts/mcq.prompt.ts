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
  const easy   = Math.round(total * ((cfg.difficultyEasy   || 30) / 100))
  const medium = Math.round(total * ((cfg.difficultyMedium || 40) / 100))
  const hard   = total - easy - medium

  return `You are a senior technical interviewer designing placement-drive MCQs for a ${role} position, similar to TCS NQT, Infosys Specialist, and Wipro Elite technical tests.

JOB DESCRIPTION:
${jd}

Generate exactly ${total} technical MCQs: ${easy} EASY, ${medium} MEDIUM, ${hard} HARD.

DIFFICULTY STANDARDS — TCS/Infosys style:
- EASY: Tests understanding of a concept but with a small twist. NOT pure definition questions. Candidate must think, not just recall. Example: "What is the output of this 4-line code snippet?" or "Which of the following is NOT a valid use of X?"
- MEDIUM: Code output prediction, edge case identification, concept application in a scenario. Options are close to each other — one common mistake leads to a wrong option. Time pressure matters.
- HARD: Multi-concept questions. Debugging a code snippet with a subtle bug. System design tradeoffs. Time complexity analysis with a twist. "What happens when..." scenario questions where 2 options seem correct but one has a subtle flaw.

QUESTION STYLE RULES — every question must follow:
1. NO pure definition questions ("What does X stand for?", "Which of these is a feature of Y?") — these are too easy and test nothing
2. Every question must require the candidate to THINK or APPLY — not just recall
3. Options must be designed to trap common mistakes:
   - One option is the most common wrong answer (plausible distractor)
   - One option is partially correct but misses a key detail
   - One option is clearly wrong only if you know the concept deeply
   - One option is correct
4. For code-based questions: show actual code snippets (4-8 lines), ask for output or identify the bug
5. For concept questions: frame as a real scenario, not an abstract definition
6. Use domain-specific terminology from the JD
7. Stem should be 2-4 sentences — enough context to require thinking

TOPICS TO COVER — extract from JD and test:
- Language/framework specific behaviour (gotchas, edge cases)
- Time/space complexity analysis
- Design pattern application
- Common bugs and their symptoms
- Real-world tradeoffs (when to use X vs Y)

Respond ONLY with valid JSON — no markdown, no explanation:
{
  "questions": [
    {
      "type": "MCQ",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "topicTag": "specific skill from JD e.g. React useEffect · SQL Indexing · REST API Design",
      "stem": "Full question text. For code questions include the code block using \\n for newlines. For scenario questions describe the exact situation.",
      "options": [
        { "id": "A", "text": "plausible but wrong — common mistake", "isCorrect": false },
        { "id": "B", "text": "correct answer", "isCorrect": true },
        { "id": "C", "text": "partially correct but missing key detail", "isCorrect": false },
        { "id": "D", "text": "wrong — only obvious if you know the concept well", "isCorrect": false }
      ],
      "explanation": "Step-by-step reasoning: why B is correct, why A is the common mistake, what concept this tests.",
      "marksAwarded": ${cfg.marksPerQuestion || 1}
    }
  ]
}`
}

// ── Aptitude MCQ Prompt ────────────────────────────────────────
export function aptitudePrompt(cfg: any): string {
  const total      = Math.ceil((cfg.totalQuestions || 20) * 2.5)
  const easy       = Math.round(total * ((cfg.difficultyEasy   || 30) / 100))
  const medium     = Math.round(total * ((cfg.difficultyMedium || 40) / 100))
  const hard       = total - easy - medium
  const marks      = cfg.marksPerQuestion || 1
  const hasTopics  = cfg.aptitudeTopics?.length > 0

  let topicInstruction = ''
  if (hasTopics) {
    const selected: string[] = cfg.aptitudeTopics
    topicInstruction = `
Focus ONLY on these selected aptitude topics (distribute questions evenly):
${selected.map((t: string) => `- ${t}`).join('\n')}
`
  } else {
    topicInstruction = `
Cover a balanced mix:
- Numerical: Percentage, Profit & Loss, Ratio & Proportion, Average, HCF & LCM
- Time-based: Speed Distance Time, Time & Work, Pipes & Cisterns
- Logical: Number Series, Syllogisms, Blood Relations, Coding-Decoding, Seating Arrangement
- Data: Data Interpretation (table/chart based)
`
  }

  return `You are a TCS/Infosys/Wipro placement test designer creating aptitude questions for corporate recruitment. Your questions appear in actual TCS NQT, Infosys Aptitude, and AMCAT tests.

Generate exactly ${total} aptitude MCQs: ${easy} EASY, ${medium} MEDIUM, ${hard} HARD.
${topicInstruction}

TCS/AMCAT DIFFICULTY STANDARDS:
- EASY: Requires formula application but numbers are designed to trap careless errors. Example: "A train 150m long passes a pole in 15 seconds. How long will it take to pass a platform 100m long?" — looks easy but candidates often forget to add platform length.
- MEDIUM: Two to three steps, time pressure matters. Hidden conditions in the problem. Example: "Two pipes fill a tank in 12 and 15 hours respectively. A third pipe drains it in 10 hours. If all three are opened simultaneously, in how many hours will the tank be full?" — requires careful sign handling.
- HARD: Multi-step with a twist. Conditional logic. Example: "A and B together complete a work in 8 days. B and C together in 12 days. A and C together in 16 days. In how many days will A, B and C together complete the work? If A works alone for 4 days and then B joins, how many more days to finish?"

QUESTION DESIGN RULES:
1. NEVER ask simple formula-plug questions where any student who memorised the formula gets it right in 5 seconds
2. Every problem must have at least one trap — a condition that changes if you read carelessly
3. Options must include:
   - The correct answer
   - The answer you get if you forget one condition (most common mistake)
   - The answer you get if you use the wrong formula variant
   - A completely wrong but plausible-looking value
4. Numbers should NOT be round numbers — use values like 37.5%, 14 days, 7/11 to make calculation non-trivial
5. Word problems must have realistic business/life context (trains, workers, shops, investments)
6. For logical series: use non-obvious patterns (alternating, difference of differences, prime-based)
7. For blood relations: minimum 4 people with at least 2 relationships to resolve
8. For seating: minimum 5 people with conditional constraints
9. Explanation must show step-by-step working with the ACTUAL calculation

Respond ONLY with valid JSON — no markdown, no explanation:
{
  "questions": [
    {
      "type": "MCQ",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "topicTag": "exact topic e.g. Time & Work · Number Series · Blood Relations",
      "stem": "Full question text with all data. For multi-part questions include all conditions clearly. For series questions show the full series.",
      "options": [
        { "id": "A", "text": "answer if you forget one condition", "isCorrect": false },
        { "id": "B", "text": "correct answer", "isCorrect": true },
        { "id": "C", "text": "answer using wrong formula variant", "isCorrect": false },
        { "id": "D", "text": "plausible but clearly wrong on careful reading", "isCorrect": false }
      ],
      "explanation": "Step 1: [calculation]. Step 2: [calculation]. Common mistake: candidates choose A because they forget [specific condition]. The correct approach: [full working].",
      "marksAwarded": ${marks}
    }
  ]
}`
}