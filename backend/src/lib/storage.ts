import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')

async function ensureDir(dir: string): Promise<void> {
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
}

/**
 * Save a file buffer locally (development).
 * In production swap this for S3 / any cloud storage.
 */
export async function saveFile(
  buffer: Buffer,
  filename: string,
  folder = 'general'
): Promise<string> {
  const dir = path.join(UPLOAD_DIR, folder)
  await ensureDir(dir)
  const filepath = path.join(dir, filename)
  await writeFile(filepath, buffer)
  // Return a relative URL path
  return `/uploads/${folder}/${filename}`
}

export async function saveResume(candidateId: string, buffer: Buffer): Promise<string> {
  return saveFile(buffer, `${candidateId}.pdf`, 'resumes')
}

export async function saveRecording(attemptId: string, buffer: Buffer, type: 'video' | 'audio'): Promise<string> {
  const ext = type === 'video' ? 'webm' : 'webm'
  return saveFile(buffer, `${attemptId}_${type}.${ext}`, 'recordings')
}