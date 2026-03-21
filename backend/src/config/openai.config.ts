import OpenAI from 'openai'
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
export const OPENAI_MODEL     = process.env.OPENAI_MODEL     || 'gpt-4o'
export const OPENAI_TTS_MODEL = process.env.OPENAI_TTS_MODEL || 'tts-1'
export const OPENAI_STT_MODEL = process.env.OPENAI_STT_MODEL || 'whisper-1'
