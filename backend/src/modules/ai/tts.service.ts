import OpenAI from 'openai'
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function textToSpeech(text: string): Promise<Buffer> {
  const response = await openai.audio.speech.create({
    model: process.env.OPENAI_TTS_MODEL || 'tts-1',
    voice: 'nova',
    input: text,
  })
  return Buffer.from(await response.arrayBuffer())
}
