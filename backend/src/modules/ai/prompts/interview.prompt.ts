// ═══════════════════════════════════════════════════════════════
// INTERVIEW PROMPTS — Production quality
// ═══════════════════════════════════════════════════════════════

// ── Standard JD-based interview ───────────────────────────────
export function interviewPrompt(jd: string, role: string, cfg: any): string {
  const count   = cfg.questionCount || 5
  const total   = Math.ceil(count * 1.5)
  const depth   = cfg.depth || 'DEEP'

  // Distribute question types based on count
  const warmup    = Math.max(1, Math.floor(total * 0.15))
  const coreTech  = Math.max(1, Math.floor(total * 0.35))
  const scenario  = Math.max(1, Math.floor(total * 0.20))
  const behavioural = Math.max(1, Math.floor(total * 0.15))
  const curveball = total - warmup - coreTech - scenario - behavioural

  return `You are a world-class technical interviewer at a top tech company conducting a ${depth === 'DEEP' ? 'senior-level' : 'mid-level'} interview for a ${role} position.

JOB DESCRIPTION:
${jd}

Generate exactly ${total} interview questions across these categories:

CATEGORY DISTRIBUTION:
- WARMUP (${warmup}): Easy confidence-building questions. Simple recall or definition. Sets tone.
- CORE_TECHNICAL (${coreTech}): Directly test the skills listed in the JD. Medium-Hard. Require real understanding not memorised answers.
- SCENARIO (${scenario}): Real production scenarios. "You are on call at 2am and X happens..." or "The CEO wants feature Y by tomorrow morning...". Hard.
- BEHAVIOURAL (${behavioural}): STAR-method questions probing past experience. "Tell me about a time you..." or "Describe a situation where...". Medium.
- CURVEBALL (${curveball}): Unexpected question testing how they THINK under pressure. Could be a brain teaser, an architectural question outside their comfort zone, or a deliberately ambiguous problem. Hard.

RUBRIC QUALITY STANDARD — Each rubric must:
1. List 3–5 SPECIFIC concepts/facts a strong answer must mention
2. Include a "Red flag" — what a memorised-but-shallow answer looks like
3. Include a "Green flag" — what only someone with real experience would say
4. Be calibrated to this specific role — not generic

FOLLOW-UP QUALITY STANDARD:
- Follow-ups must be triggered by specific candidate weaknesses
- trigger: "if candidate only mentions X but not Y" 
- follow-up: forces them to go deeper on the gap

${depth === 'SHALLOW' ? 'Questions should be answerable in 1–2 minutes. Assess breadth not depth.' : 'Questions should require 3–5 minute answers. Probe until you hit the edges of their knowledge.'}

Respond ONLY with valid JSON — no markdown, no explanation:
{
  "prompts": [
    {
      "type": "INTERVIEW_PROMPT",
      "category": "WARMUP|CORE_TECHNICAL|SCENARIO|BEHAVIOURAL|CURVEBALL",
      "difficulty": "EASY|MEDIUM|HARD",
      "topicTag": "specific topic e.g. React hooks lifecycle, SQL query optimisation, System design",
      "prompt": "The exact question as the interviewer would speak it — natural, conversational, not robotic",
      "evaluationRubric": "MUST MENTION: [specific concept 1], [specific concept 2], [specific concept 3]. GREEN FLAG: [what only a practitioner would say]. RED FLAG: [what a surface-level memorised answer looks like]. SCORING: 9-10 if all MUST MENTION covered + GREEN FLAG shown. 6-8 if MUST MENTION covered. 3-5 if partial. 0-2 if RED FLAG without substance.",
      "followUpPrompts": [
        {"trigger": "if they mention X but not Y", "prompt": "follow-up question"},
        {"trigger": "if answer is too theoretical", "prompt": "Can you give me a real example from your experience?"},
        {"trigger": "if score would be below 6", "prompt": "deeper probing question"}
      ]
    }
  ]
}`
}

// ── Resume-aware: personalised + JD ───────────────────────────
export function resumeAwareInterviewPrompt(
  jd: string, role: string, resumeText: string, cfg: any
): string {
  const count       = cfg.questionCount || 5
  const total       = Math.ceil(count * 1.5)
  const resumeSplit = cfg.resumeSplit || 30
  const resumeCount = Math.round(total * resumeSplit / 100)
  const jdCount     = total - resumeCount
  const depth       = cfg.depth || 'DEEP'

  return `You are a world-class technical interviewer conducting a ${depth === 'DEEP' ? 'senior-level' : 'mid-level'} interview for a ${role} position. You have reviewed the candidate's resume before the interview and will use it to ask targeted questions.

JOB DESCRIPTION:
${jd}

CANDIDATE RESUME (you have read this):
${resumeText.slice(0, 5000)}

Generate exactly ${total} interview questions:

PART A — ${jdCount} JD-BASED QUESTIONS:
Test the skills required by this specific job. Cover different categories: technical, scenario, behavioural.

PART B — ${resumeCount} RESUME-DRILL QUESTIONS:
Attack specific claims on their resume. Reference their actual companies, projects, technologies.

RESUME DRILL RULES — this is the most important section:
- Extract specific claims from resume: job titles, company names, projects, technologies, metrics
- Question must DIRECTLY reference what they wrote — not a generic question about the technology
  WRONG: "Tell me about your experience with React"
  RIGHT: "You mentioned building a real-time dashboard at Infosys — what was the biggest performance bottleneck and how did you resolve it?"
  WRONG: "What is Docker?"
  RIGHT: "Your resume says you containerised 3 microservices at TechCorp — walk me through how you handled service discovery between them"
- If resume mentions a metric (e.g. "reduced latency by 40%") — ALWAYS ask HOW they achieved that specific metric
- If resume mentions a senior title — ask something only that seniority level would know
- If resume mentions a technology without depth — probe whether they actually used it or just listed it
- Purpose: verify claims, detect resume padding, find genuine expertise vs surface-level listing

RUBRIC STANDARD: Each rubric must list what a genuine practitioner (not someone who just listed it on a resume) would answer.

Respond ONLY with valid JSON:
{
  "prompts": [
    {
      "type": "INTERVIEW_PROMPT",
      "category": "CORE_TECHNICAL|SCENARIO|BEHAVIOURAL|RESUME_DRILL",
      "difficulty": "EASY|MEDIUM|HARD",
      "topicTag": "jd: <topic> OR resume: <company/project they mentioned>",
      "prompt": "Natural conversational question — for resume drills, reference their specific experience",
      "evaluationRubric": "MUST MENTION: [...]. GREEN FLAG: [...]. RED FLAG: [...]. RESUME VERIFICATION: what proves they actually did this vs just listed it.",
      "followUpPrompts": [
        {"trigger": "if they give a generic answer", "prompt": "I noticed on your resume you specifically said [X] — can you walk me through exactly how that worked?"},
        {"trigger": "if they can't recall specifics", "prompt": "Even approximate details are fine — what do you remember about the technical approach?"},
        {"trigger": "if answer is strong", "prompt": "deeper extension question to probe the limits"}
      ]
    }
  ]
}`
}

// ── LIVE_CODING: problem + explanation prompt ──────────────────
export function liveCodingPrompt(
  jd: string, role: string, resumeText: string, cfg: any
): string {
  const count      = cfg.questionCount || 2
  const total      = Math.ceil(count * 1.5)
  const langs      = (cfg.allowedLanguages || ['javascript', 'python']).join(', ')
  const useResume  = resumeText && resumeText.length > 100

  const resumeSection = useResume ? `
CANDIDATE RESUME:
${resumeText.slice(0, 3000)}

PERSONALISATION RULE: If the resume lists specific languages or frameworks, prefer problems that can be solved using those. If they claim "5 years Python experience", a medium Python problem should be easy for them — choose accordingly. The goal is to test their REAL level, not catch them out with unfamiliar syntax.
` : ''

  return `You are a senior engineering interviewer creating live coding problems for a ${role} position.

JOB DESCRIPTION:
${jd}
${resumeSection}
Generate exactly ${total} live coding problems.

PROBLEM DESIGN RULES:
- Each problem must be solvable in 15–25 minutes
- Mix of difficulty: at least one EASY (warm-up) and one MEDIUM/HARD
- Problems must be relevant to the actual JD tech stack — not generic algorithm puzzles unless the JD asks for algorithms
- EASY example: manipulate a data structure, write a utility function, parse a format
- MEDIUM example: implement a feature component, write an API handler, optimise a query
- HARD example: design a small system, solve a concurrency problem, implement a data structure

TEST CASE RULES:
- 3 visible: basic case, typical case, boundary case (candidate can see these)
- 2 hidden: edge cases, large input, empty input (only visible to system)
- Expected output must be EXACT — no ambiguity

EXPLANATION PROMPT RULES (critical — this is what detects AI-generated code):
- Must ask about their SPECIFIC code choices, not generic algorithm theory
- Must ask about at least ONE thing that would differ between implementations
- Must ask about time AND space complexity
- Must ask about what would break this solution (edge cases)
- Should feel like a natural follow-up from a human interviewer, not a checklist

EXPLANATION RUBRIC RULES:
- Must describe what someone who WROTE the code would know vs someone who copied it
- "Copied code signal": if explanation doesn't match their actual code structure
- "Genuine signal": explains WHY they chose their specific variable names, data structure, loop structure

Respond ONLY with valid JSON:
{
  "problems": [
    {
      "type": "INTERVIEW_PROMPT",
      "difficulty": "EASY|MEDIUM|HARD",
      "topicTag": "specific topic e.g. Hash Map · String manipulation · Recursion",
      "liveCodingProblem": "Full problem statement with: context sentence, input format, output format, constraints, examples",
      "liveCodingTestCases": [
        {"input": "exact input", "expectedOutput": "exact output", "isHidden": false},
        {"input": "boundary case", "expectedOutput": "exact output", "isHidden": false},
        {"input": "normal case", "expectedOutput": "exact output", "isHidden": false},
        {"input": "edge case — empty/null", "expectedOutput": "exact output", "isHidden": true},
        {"input": "edge case — large/extreme", "expectedOutput": "exact output", "isHidden": true}
      ],
      "liveCodingStarter": {
        "javascript": "complete function stub with JSDoc parameter types",
        "python": "complete function stub with type hints"
      },
      "explanationPrompt": "Conversational follow-up that references the problem specifically — e.g. 'I see you used a hash map here — walk me through why you made that choice over a simple array scan, and what's the time complexity of your lookup?'",
      "explanationRubric": "GENUINE SIGNALS: explains why they chose specific data structure, mentions exact complexity, can describe what changes if constraints change. COPIED CODE SIGNALS: explanation uses different terminology than code, can't explain specific lines, gives textbook definition instead of describing their implementation. SCORING: 9-10 = explains own code fluently. 7-8 = understands approach with minor gaps. 5-6 = understands generally but can't explain details. 3-4 = vague, likely didn't write it. 0-2 = explanation contradicts or can't describe the code.",
      "marksAwarded": 10
    }
  ]
}`
}

// ── Explanation evaluation against actual code ─────────────────
export function explanationEvalPrompt(params: {
  problem:    string
  code:       string
  language:   string
  transcript: string
  rubric:     string
  role:       string
}): string {
  return `You are evaluating whether a ${params.role} candidate genuinely wrote their own code during a live coding interview, or whether they likely copied/used AI assistance.

PROBLEM THEY WERE GIVEN:
${params.problem}

CODE THEY SUBMITTED (${params.language}):
\`\`\`${params.language}
${params.code}
\`\`\`

EVALUATION RUBRIC:
${params.rubric}

THEIR AUDIO EXPLANATION (verbatim transcript):
"${params.transcript}"

EVALUATION FRAMEWORK:

Step 1 — Code-Explanation Alignment Check:
Does the explanation accurately describe what the code ACTUALLY does? (Not what the algorithm does in general — what THIS specific code does.)
- Do variable names they mention match the code?
- Do they describe the loop/recursion structure correctly?
- Do they explain WHY they wrote it this way vs other ways?

Step 2 — Depth Check:
- Did they state the actual time complexity? (O(n), O(n log n), etc.)
- Did they state the actual space complexity?
- Did they mention edge cases their code handles?
- Can they identify what would break their solution?

Step 3 — Genuine Ownership Signals:
GENUINE: "I used a hash map because I wanted O(1) lookups instead of scanning the array each time"
GENUINE: "I wasn't sure about the edge case when the input is empty so I added that null check on line 3"
GENUINE: "I could have done this recursively but iteration avoids stack overflow on large inputs"
COPIED: Generic algorithm theory that doesn't match their code structure
COPIED: Can't explain why specific variables are named the way they are
COPIED: Explanation describes a different approach than what they actually coded
COPIED: Perfect textbook explanation for a solution they couldn't modify or extend

Respond ONLY with valid JSON:
{
  "score": <0-10>,
  "reasoning": "2-3 sentences specifically about alignment between their explanation and their code",
  "copiedCodeSignal": <true/false>,
  "copiedCodeEvidence": "specific evidence — e.g. 'Explanation described iterative approach but candidate wrote recursive code' or 'null if no signal'",
  "depthScore": <0-10>,
  "complexityCorrect": <true/false>,
  "followUp": "specific follow-up question if score < 7, null if score >= 7"
}`
}