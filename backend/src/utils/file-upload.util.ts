import multer from 'multer'

export const resumeUpload = multer({
  storage:    multer.memoryStorage(),
  limits:     { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true)
    else cb(new Error('Only PDF files are allowed'))
  },
})

// FIX 5: Real PDF text extraction using pdf-parse
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = require('pdf-parse')
    const result   = await pdfParse(buffer)
    // Clean up the text — remove excessive whitespace
    const text = result.text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    return text.slice(0, 8000) // cap at 8k chars for AI context
  } catch (err: any) {
    console.warn('[PDF] Extraction failed, using fallback:', err.message)
    // Fallback: basic text extraction
    const text = buffer.toString('utf8').replace(/[^\x20-\x7E\n]/g, ' ').replace(/\s+/g, ' ').trim()
    return text.slice(0, 5000)
  }
}