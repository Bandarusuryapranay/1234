import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, CheckCircle, ArrowRight, UploadCloud } from 'lucide-react'
import toast from 'react-hot-toast'
import { candidateApi } from '../../services/api.services'

export default function ResumeUploadPage() {
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0])
    }
  }

  const handleFileSelection = (selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed.')
      return
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error('File exceeds 5MB limit.')
      return
    }
    setFile(selectedFile)
  }

  const submitResume = async () => {
    if (!file) return
    setLoading(true)
    try {
      await candidateApi.uploadResume(file)
      toast.success('Resume uploaded successfully!')
      navigate('/candidate/lobby')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to upload resume')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--dark)',
      color: 'var(--cream)',
      padding: '20px'
    }}>
      <div className="card fade-in" style={{ maxWidth: '600px', width: '100%', padding: '40px' }}>
        <h1 style={{ marginBottom: '8px', textAlign: 'center' }}>
          Upload <span style={{ color: 'var(--orange)' }}>Resume</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '32px' }}>
          Your resume is required for our AI-tailored assessment rounds.
        </p>

        <form 
          onDragEnter={handleDrag}
          style={{ width: '100%', marginBottom: '24px' }}
        >
          <div 
            style={{
              border: `2px dashed ${dragActive ? 'var(--orange)' : file ? 'var(--green-dark)' : 'var(--border)'}`,
              borderRadius: '12px',
              padding: '60px 20px',
              textAlign: 'center',
              backgroundColor: dragActive ? 'rgba(251, 133, 30, 0.05)' : 'var(--bg-elevated)',
              transition: 'all 0.2s',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={handleChange}
            />

            {file ? (
              <>
                <FileText size={48} color="var(--green-dark)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--cream)' }}>{file.name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--green-dark)', fontSize: '0.85rem', fontWeight: 600 }}>
                  <CheckCircle size={14} /> Ready to upload
                </div>
              </>
            ) : (
              <>
                <UploadCloud size={48} color="var(--orange)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--cream)' }}>Drag & drop your resume</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>or click to browse</div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  PDF format only (Max 5MB)
                </div>
              </>
            )}
          </div>
        </form>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          {file && (
            <button className="btn btn-ghost" onClick={() => setFile(null)} disabled={loading}>
              Clear
            </button>
          )}
          <button 
            className="btn btn-primary" 
            onClick={submitResume}
            disabled={!file || loading}
            style={{ width: file ? 'auto' : '100%', padding: '12px 24px' }}
          >
            {loading ? (
              <><div className="spinner spinner-sm" /> Analyzing...</>
            ) : (
              <>Continue to Assessment <ArrowRight size={16} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
