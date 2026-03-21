export function gapAnalysisPrompt(input: {
  jobDescription:   string
  role:             string
  resumeText:       string
  roundScores:      any[]
  strikeCount:      number
  maxStrikes:       number
  interviewAnswers: any[]
}): string {

  // Format round scores clearly
  const roundSummary = input.roundScores.map((r: any, i: number) =>
    `Round ${i + 1} (${r.roundType}): ${r.percentScore?.toFixed(1) ?? 0}% — ${r.passed ? 'PASSED' : 'FAILED'}`
  ).join('\n')

  // Format interview answers with scores
  const interviewSummary = input.interviewAnswers.slice(0, 6).map((a: any) =>
    `Q [${a.topicTag || 'General'}]: "${a.prompt?.slice(0, 120)}..."
     Score: ${a.aiScore ?? 'N/A'}/10
     Answer summary: ${(a.textAnswer || a.sttTranscript || '').slice(0, 200)}
     AI reasoning: ${(a.aiReasoning || '').slice(0, 150)}`
  ).join('\n\n')

  // LIVE_CODING signals
  const liveCodingAnswers = input.interviewAnswers.filter((a: any) => a.mode === 'LIVE_CODING')
  const copiedSignals     = liveCodingAnswers.filter((a: any) => a.copiedCodeSignal).length
  const liveCodingSummary = liveCodingAnswers.length > 0
    ? `LIVE CODING RESULTS:
${liveCodingAnswers.map((a: any) => `- Code score: ${a.codeScore ?? 0}/10, Explanation score: ${a.explainScore ?? 0}/10, Combined: ${a.aiScore?.toFixed(1) ?? 0}/10${a.copiedCodeSignal ? ' ⚠ COPY-PASTE SIGNAL DETECTED' : ''}`).join('\n')}
${copiedSignals > 0 ? `⚠ ${copiedSignals} problem(s) showed evidence of AI-generated or copied code — candidate's explanation did not match their submitted code.` : 'No copy-paste signals detected.'}`
    : ''

  return `You are a senior technical recruiter producing a final evaluation report for a ${input.role} candidate.

JOB DESCRIPTION:
${input.jobDescription}

CANDIDATE RESUME:
${(input.resumeText || 'Not provided').slice(0, 4000)}

ASSESSMENT PERFORMANCE:
${roundSummary || 'No rounds completed'}

INTERVIEW PERFORMANCE:
${interviewSummary || 'No interview data available'}

${liveCodingSummary}

PROCTORING:
Violations: ${input.strikeCount} out of max ${input.maxStrikes} strikes
${input.strikeCount >= input.maxStrikes ? '⚠ Session was terminated due to proctoring violations.' : input.strikeCount > 0 ? `⚠ ${input.strikeCount} proctoring violation(s) recorded.` : 'Clean session — no violations.'}

INSTRUCTIONS FOR YOUR ANALYSIS:

1. TECHNICAL FIT % (0–100):
   - Base on actual assessment performance, not resume claims
   - Weight: Interview scores 40%, MCQ/Coding scores 40%, Resume-JD match 20%
   - Penalise if resume claims contradict weak interview performance on that topic
   - If live coding copy-paste signals detected, cap technical fit at 65% max

2. STRENGTHS:
   - Only list strengths PROVEN by assessment scores, not resume claims
   - Each strength must cite evidence: "Strong React knowledge (8.5/10 interview score on hooks question)"

3. SKILL GAPS:
   - Skills required by JD that candidate demonstrated weakness in
   - Be specific: "Unable to explain SQL index optimisation despite claiming 3 years DB experience"
   - Note if gap appears in both interview AND resume (possible exaggeration)

4. JD SKILL MATCH:
   - Skills from JD the candidate demonstrably has (backed by good scores)

5. JD MISSING SKILLS:
   - Skills from JD the candidate is missing or underperformed on

6. RESUME CREDIBILITY (new field):
   - Flag if interview performance significantly contradicts resume claims
   - e.g. "Claims senior Node.js developer but scored 3/10 on async/await question"
   - Rate: HIGH / MEDIUM / LOW with 1-sentence reason

7. AI SUMMARY (3–4 sentences for the recruiter):
   - Start with overall recommendation tone (Strong hire / Hire / Maybe / No hire)
   - Highlight the most important strength
   - Highlight the most important gap
   - Note any integrity concerns (proctoring, copy-paste signals, resume credibility)

Respond ONLY with valid JSON — no markdown:
{
  "technicalFitPercent": <0-100>,
  "strengths": ["evidence-backed strength 1", "evidence-backed strength 2"],
  "gaps": ["specific gap with evidence", "specific gap with evidence"],
  "jdMatchedSkills": ["confirmed skill 1", "confirmed skill 2"],
  "jdMissingSkills": ["missing skill 1", "missing skill 2"],
  "resumeCredibility": "HIGH|MEDIUM|LOW",
  "resumeCredibilityReason": "one sentence explanation",
  "copiedCodeDetected": <true/false>,
  "aiSummary": "3-4 sentence executive summary with recommendation"
}`
}