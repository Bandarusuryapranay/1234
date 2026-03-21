import { z } from 'zod'

const EnvSchema = z.object({
  DATABASE_URL:      z.string(),
  JWT_SECRET:        z.string().min(32),
  JWT_EXPIRES_IN:    z.string().default('15m'),
  JWT_REFRESH_SECRET:z.string().min(32),
  PORT:              z.string().default('4000'),
  NODE_ENV:          z.enum(['development', 'production', 'test']).default('development'),
  
  // AI Config (Groq routed through OpenAI SDK)
  OPENAI_API_KEY:    z.string(), // This will hold your GROQ_API_KEY
  OPENAI_BASE_URL:   z.string().default('https://api.groq.com/openai/v1'),
  OPENAI_MODEL:      z.string().default('llama-3.3-70b-versatile'),
  OPENAI_STT_MODEL:  z.string().default('whisper-large-v3-turbo'),
  
  // Judge0
  JUDGE0_API_URL:    z.string().default('http://localhost:2358'),
  JUDGE0_API_KEY:    z.string().optional().default(''),

  // Email
  AZURE_TENANT_ID:   z.string(),
  AZURE_CLIENT_ID:   z.string(),
  AZURE_CLIENT_SECRET: z.string(),
  GRAPH_SENDER_EMAIL: z.string().email(),
})

export const env = EnvSchema.parse(process.env)