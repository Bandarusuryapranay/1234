import OpenAI from 'openai'
import { mcqPrompt, aptitudePrompt } from './prompts/mcq.prompt'
import { codingPrompt, dsaPrompt } from './prompts/coding.prompt'
import {
  interviewPrompt,
  resumeAwareInterviewPrompt,
  liveCodingPrompt,
  explanationEvalPrompt,
} from './prompts/interview.prompt'
import { gapAnalysisPrompt } from './prompts/gap-analysis.prompt'

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
})

export const MODEL = 'llama-3.3-70b-versatile'
const STT_MODEL = 'whisper-large-v3-turbo'

async function chat(prompt: string, temperature = 0.8): Promise<any> {
  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature,
  })
  return JSON.parse(res.choices[0].message.content || '{}')
}

// ── MCQ Generation ─────────────────────────────────────────────
export async function generateMCQs(jd: string, role: string, cfg: any) {
  const mode = cfg.questionMode || 'JD_BASED'
  const prompt = mode === 'APTITUDE' ? aptitudePrompt(cfg) : mcqPrompt(jd, role, cfg)
  const result = await chat(prompt)
  return result.questions || result
}

// ── Coding Generation ──────────────────────────────────────────
export async function generateCodingProblems(jd: string, role: string, cfg: any) {
  const mode = cfg.questionMode || 'JD_BASED'
  const prompt = mode === 'DSA' ? dsaPrompt(cfg) : codingPrompt(jd, role, cfg)
  const result = await chat(prompt)
  return result.problems || result
}

// ── Interview Generation — resume-aware + LIVE_CODING support ──
export async function generateInterviewPrompts(
  jd: string, role: string, cfg: any, resumeText?: string
) {
  const mode = cfg.interviewMode || 'TEXT'

  // LIVE_CODING mode — generates coding problems with explanation prompts
  if (mode === 'LIVE_CODING') {
    const prompt = liveCodingPrompt(jd, role, resumeText || '', cfg)
    const result = await chat(prompt)
    return result.problems || result
  }

  // Resume-aware if resume text provided and resumeSplit > 0
  if (resumeText && resumeText.length > 100 && (cfg.resumeSplit || 0) > 0) {
    const prompt = resumeAwareInterviewPrompt(jd, role, resumeText, cfg)
    const result = await chat(prompt)
    return result.prompts || result
  }

  // Standard JD-based
  const prompt = interviewPrompt(jd, role, cfg)
  const result = await chat(prompt)
  return result.prompts || result
}

// ── Gap Analysis ───────────────────────────────────────────────
export async function runGapAnalysis(input: {
  jobDescription: string
  role: string
  resumeText: string
  roundScores: any[]
  strikeCount: number
  maxStrikes: number
  interviewAnswers: any[]
}) {
  const prompt = gapAnalysisPrompt(input)
  const result = await chat(prompt, 0.4)
  const strikePenalty = (input.strikeCount / input.maxStrikes) * 20
  const trustScore = Math.max(0, Math.min(100, 100 - strikePenalty))
  return { ...result, trustScore }
}

// ── Interview Answer Evaluation — context-aware ───────────────

export async function evaluateInterviewAnswer(params: {
  prompt: string
  answer: string
  rubric: string
  role: string
  category?: string
  topicTag?: string
  configuredFollowUps?: any[] // NEW: The triggers from your prompt
}): Promise<{ score: number; reasoning: string; followUp?: string }> {

  const categoryContext = params.category
    ? `Question category: ${params.category}.`
    : '';

  // NEW: Instruction block for the AI to handle your custom triggers
  const followUpInstruction = params.configuredFollowUps && params.configuredFollowUps.length > 0
    ? `CANDIDATE-SPECIFIC FOLLOW-UP RULES:
       You MUST check the candidate's answer against these triggers:
       ${JSON.stringify(params.configuredFollowUps, null, 2)}
       If a trigger condition is met (e.g., they missed a specific technical detail), you MUST return the corresponding "prompt" in the "followUp" field.`
    : `If the score is below 8, generate a brief, natural follow-up question to probe the weakness. Otherwise, return null.`;

  const evalPrompt = `You are a world-class interviewer for a ${params.role} position.
${categoryContext}
Topic: ${params.topicTag || 'General'}

ORIGINAL QUESTION: "${params.prompt}"
EVALUATION RUBRIC: ${params.rubric}
CANDIDATE ANSWER: "${params.answer}"

${followUpInstruction}

Respond ONLY with valid JSON:
{
  "score": <0-10>,
  "reasoning": "2-3 sentences citing the rubric vs the answer",
  "followUp": "The follow-up question text or null"
}`;

  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [{ role: 'user', content: evalPrompt }],
    response_format: { type: 'json_object' },
  });

  return JSON.parse(res.choices[0].message.content || '{"score":0,"reasoning":"","followUp":null}');
}

// ── LIVE_CODING Explanation Evaluation ────────────────────────
// Update the parameters to include configuredFollowUps
export async function evaluateCodeExplanation(params: {
  problem: string
  code: string
  language: string
  transcript: string
  rubric: string
  role: string
  configuredFollowUps?: any[] // <-- ADD THIS LINE
}): Promise<{
  score: number
  reasoning: string
  copiedCodeSignal: boolean
  followUp?: string
}> {
  // Add instructions for the follow-up triggers
  const followUpInstruction = params.configuredFollowUps && params.configuredFollowUps.length > 0
    ? `CODE-SPECIFIC FOLLOW-UP RULES:
       If the candidate's explanation matches these triggers, use the prompt provided:
       ${JSON.stringify(params.configuredFollowUps, null, 2)}`
    : `If the explanation is weak or doesn't match the code, generate a follow-up question.`;

  const prompt = explanationEvalPrompt(params) + `\n\n${followUpInstruction}`;
  
  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  });

  return JSON.parse(res.choices[0].message.content || '{"score":0,"reasoning":"","copiedCodeSignal":false}');
}

// ── Speech to Text (Groq Whisper) ──────────────────────────────
export async function transcribeAudio(audioBuffer: Buffer): Promise<{ text: string }> {
  const ab = audioBuffer.buffer.slice(audioBuffer.byteOffset, audioBuffer.byteOffset + audioBuffer.byteLength)
  const blob = new Blob([ab as ArrayBuffer], { type: 'audio/webm' })
  const file = new File([blob], 'answer.webm', { type: 'audio/webm' })
  const result = await openai.audio.transcriptions.create({
    model: STT_MODEL,
    file,
    response_format: 'json',
  })
  return { text: result.text }
}

export async function generateTTS(_text: string): Promise<Buffer> {
  throw new Error('TTS is handled on the frontend via the Web Speech API')
}