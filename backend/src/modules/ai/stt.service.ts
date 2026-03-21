import OpenAI, { toFile } from 'openai' // 1. Import toFile helper

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function speechToText(audioBuffer: Buffer): Promise<{ text: string, confidence?: number }> {
  // 2. Use toFile to convert the buffer into a format the SDK understands
  const file = await toFile(audioBuffer, 'answer.webm', { type: 'audio/webm' });

  const result = await openai.audio.transcriptions.create({
    model: process.env.OPENAI_STT_MODEL || 'whisper-1',
    file,
    response_format: 'verbose_json',
  })

  return { text: result.text }
}