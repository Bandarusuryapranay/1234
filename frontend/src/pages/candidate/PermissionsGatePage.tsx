import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Mic, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store/authStore'

export default function PermissionsGatePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const videoRef = useRef<HTMLVideoElement>(null)

  const [cameraState, setCameraState] = useState<'pending' | 'testing' | 'success' | 'failed'>('pending')
  const [micState, setMicState] = useState<'pending' | 'testing' | 'success' | 'failed'>('pending')
  const [volumeLevel, setVolumeLevel] = useState(0)

  const testPermissions = async () => {
    setCameraState('testing')
    setMicState('testing')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }

      setCameraState('success')
      setMicState('success')

      // Set up Audio Context to detect microphone activity
      const audioContext = new AudioContext()
      const analyser = audioContext.createAnalyser()
      const microphone = audioContext.createMediaStreamSource(stream)

      analyser.smoothingTimeConstant = 0.8
      analyser.fftSize = 1024
      microphone.connect(analyser)

      const updateVolume = () => {
        if (micState === 'failed') return;
        const array = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(array)
        let values = 0
        for (let i = 0; i < array.length; i++) {
          values += array[i]
        }
        const average = values / array.length
        setVolumeLevel(average)
        
        if (stream.active) {
          requestAnimationFrame(updateVolume)
        }
      }
      
      updateVolume()

    } catch (err: any) {
      console.error('Camera/Mic permission error:', err)
      toast.error('Permissions denied. Please allow camera and microphone access to continue.')
      setCameraState('failed')
      setMicState('failed')
    }
  }

  const handleContinue = () => {
    sessionStorage.setItem('permissions_granted', 'true')
    
    // Stop tracks
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
    }

    if (user?.mustChangePassword) {
      navigate('/force-change-password')
    } else {
      navigate('/candidate/identity-verification')
    }
  }

  useEffect(() => {
    return () => {
      // Cleanup tracks on unmount
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [videoRef])

  const bothWorking = cameraState === 'success' && micState === 'success'

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      color: 'var(--text-primary)',
      padding: '20px'
    }}>
      <div className="card fade-in" style={{ maxWidth: '600px', width: '100%', padding: '40px' }}>
        <h1 style={{ marginBottom: '8px', textAlign: 'center' }}>
          <span style={{ color: 'var(--orange)' }}>System</span> Check
        </h1>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '32px' }}>
          To ensure a fair and supervised assessment environment, we require camera and microphone access.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
          
          {/* Camera Card */}
          <div style={{
            background: 'var(--bg-elevated)', borderRadius: '12px', padding: '20px',
            border: `1px solid ${cameraState === 'success' ? 'var(--green-dark)' : cameraState === 'failed' ? 'var(--red)' : 'var(--border)'}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
          }}>
            <div style={{ color: cameraState === 'success' ? 'var(--green-dark)' : 'var(--text-muted)' }}>
              <Camera size={40} />
            </div>
            
            <div style={{ width: '100%', height: '140px', background: 'var(--bg-hover)', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
              {cameraState === 'success' ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                  <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.6)', borderRadius: '4px', padding: '2px 6px', fontSize: '0.7rem', color: 'var(--green)' }}>Live</div>
                </>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {cameraState === 'testing' ? 'Connecting...' : cameraState === 'failed' ? 'Camera failed' : 'Camera inactive'}
                </div>
              )}
            </div>

            <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
               {cameraState === 'success' && <><CheckCircle size={14} color="var(--green-dark)" /> Camera Works</>}
               {cameraState === 'failed' && <><AlertCircle size={14} color="var(--red)" /> Camera Blocked</>}
               {cameraState === 'pending' && <span style={{ color: 'var(--text-muted)' }}>Waiting...</span>}
            </div>
          </div>

          {/* Microphone Card */}
          <div style={{
            background: 'var(--bg-elevated)', borderRadius: '12px', padding: '20px',
            border: `1px solid ${micState === 'success' ? 'var(--green-dark)' : micState === 'failed' ? 'var(--red)' : 'var(--border)'}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px'
          }}>
            <div style={{ color: micState === 'success' ? 'var(--green-dark)' : 'var(--text-muted)' }}>
              <Mic size={40} />
            </div>
            
            <div style={{ width: '100%', height: '140px', background: 'var(--bg-hover)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
              {micState === 'success' ? (
                <>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mic Activity</div>
                  <div style={{ width: '80%', height: '20px', background: 'var(--bg-base)', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${Math.min(100, volumeLevel * 2)}%`, 
                      background: 'var(--orange)',
                      transition: 'width 0.1s ease-out'
                    }} />
                  </div>
                </>
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {micState === 'testing' ? 'Connecting...' : micState === 'failed' ? 'Mic failed' : 'Mic inactive'}
                </div>
              )}
            </div>

            <div style={{ fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
               {micState === 'success' && <><CheckCircle size={14} color="var(--green-dark)" /> Mic Works</>}
               {micState === 'failed' && <><AlertCircle size={14} color="var(--red)" /> Mic Blocked</>}
               {micState === 'pending' && <span style={{ color: 'var(--text-muted)' }}>Waiting...</span>}
            </div>
          </div>

        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!bothWorking ? (
            <button className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1rem' }} onClick={testPermissions}>
              <RefreshCw size={18} /> Run System Check
            </button>
          ) : (
            <button className="btn btn-success" style={{ width: '100%', padding: '14px', fontSize: '1rem' }} onClick={handleContinue}>
              Continue to Assessment <CheckCircle size={18} />
            </button>
          )}

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '12px' }}>
             Supported browsers: Google Chrome, Microsoft Edge, Brave. <br/> (Safari may experience issues with Proctoring AI).
          </div>
        </div>
      </div>
    </div>
  )
}
