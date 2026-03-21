import { useEffect, useRef, useState } from 'react'
import { proctoringApi } from '../../services/api.services'
import { uploadToCloudinary } from '../../utils/cloudinary.util'
import { FilesetResolver, FaceLandmarker, ObjectDetector } from '@mediapipe/tasks-vision'
import { Peer } from 'peerjs'
import toast from 'react-hot-toast'

interface WatcherOverlayProps {
  candidateId: string
  attemptId: string | null
  onStrike: (reason: string) => void
  disabled?: boolean
}

export default function WatcherOverlay({ candidateId, attemptId, onStrike, disabled }: WatcherOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const [visionReady, setVisionReady] = useState(false)
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null)
  const objectDetectorRef = useRef<ObjectDetector | null>(null)
  
  const noFaceCount = useRef(0)
  const multiFaceCount = useRef(0)

  // 1. Initialize Camera & WebRTC Peer
  useEffect(() => {
    if (disabled) return
    let activeStream: MediaStream | null = null
    let peer: Peer | null = null

    async function setupCameraAndPeer() {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360 }, audio: true })
        if (videoRef.current) videoRef.current.srcObject = activeStream

        // WebRTC Recruiter Monitoring Peer
        peer = new Peer(candidateId, { debug: 2 })
        peer.on('call', (call) => {
          // Auto-answer the recruiter's call with our stream
          call.answer(activeStream!)
        })
      } catch (err) {
        toast.error('Camera/Mic access denied')
        onStrike('Camera or Mic access denied/lost')
      }
    }

    setupCameraAndPeer()

    return () => {
      if (activeStream) activeStream.getTracks().forEach(t => t.stop())
      if (peer) peer.destroy()
    }
  }, [disabled, candidateId, onStrike])

  // 2. Initialize MediaPipe
  useEffect(() => {
    if (disabled) return
    let isCancelled = false

    async function loadMediaPipe() {
      try {
        const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm')
        if (isCancelled) return

        const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU'
          },
          outputFaceBlendshapes: false,
          runningMode: 'VIDEO',
          numFaces: 5
        })

        const objectDetector = await ObjectDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.task',
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          scoreThreshold: 0.5
        })

        if (!isCancelled) {
          faceLandmarkerRef.current = faceLandmarker
          objectDetectorRef.current = objectDetector
          setVisionReady(true)
        }
      } catch (err) {
        console.error('MediaPipe initialization failed', err)
      }
    }

    loadMediaPipe()
    return () => { isCancelled = true }
  }, [disabled])

  // 3. Run MediaPipe Detection Loops
  useEffect(() => {
    if (!visionReady || disabled || !attemptId || !videoRef.current) return
    
    const video = videoRef.current
    let faceTimer: any
    let objectTimer: any
    let lastVideoTime = -1

    const checkFaces = () => {
      if (!video) return
      if (video.videoWidth === 0) return // not ready yet
      const tm = performance.now()
      if (video.currentTime !== lastVideoTime && faceLandmarkerRef.current) {
        const result = faceLandmarkerRef.current.detectForVideo(video, tm)
        lastVideoTime = video.currentTime

        if (result.faceLandmarks.length === 0) {
          noFaceCount.current += 1
          multiFaceCount.current = 0
          if (noFaceCount.current >= 3) {
            triggerViolation('FACE_AWAY')
            noFaceCount.current = 0
          }
        } else if (result.faceLandmarks.length > 1) {
          multiFaceCount.current += 1
          noFaceCount.current = 0
          if (multiFaceCount.current >= 2) {
            triggerViolation('MULTIPLE_FACES')
            multiFaceCount.current = 0
          }
        } else {
          // Everything is normal (1 face)
          noFaceCount.current = 0
          multiFaceCount.current = 0
        }
      }
    }

    const checkObjects = () => {
      if (!video) return
      if (video.videoWidth === 0) return
      if (objectDetectorRef.current) {
        const result = objectDetectorRef.current.detectForVideo(video, performance.now())
        const cellPhone = result.detections.find(d => d.categories.some(c => c.categoryName === 'cell phone'))
        if (cellPhone) {
          triggerViolation('PHONE_DETECTED')
        }
      }
    }

    faceTimer = setInterval(checkFaces, 500)
    objectTimer = setInterval(checkObjects, 1000)

    return () => {
      clearInterval(faceTimer)
      clearInterval(objectTimer)
    }
  }, [visionReady, disabled, attemptId])

  // 4. Browsing Behaviors (Tab Switch, Blur)
  useEffect(() => {
    if (disabled || !attemptId) return

    const handleVisibility = () => {
      if (document.hidden) triggerViolation('TAB_SWITCH')
    }
    const handleBlur = () => triggerViolation('FOCUS_LOSS')

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('blur', handleBlur)
    }
  }, [disabled, attemptId])

  // Capture screenshot and trigger violation
  const triggerViolation = async (violationType: string) => {
    onStrike(violationType) // visual feedback immediately
    
    if (!attemptId) return

    let screenshotUrl = ''
    if (videoRef.current && canvasRef.current) {
      const v = videoRef.current
      const c = canvasRef.current
      c.width = v.videoWidth
      c.height = v.videoHeight
      const ctx = c.getContext('2d')
      if (ctx) {
        ctx.drawImage(v, 0, 0, c.width, c.height)
        const dataUrl = c.toDataURL('image/jpeg', 0.6)
        try {
          screenshotUrl = await uploadToCloudinary(dataUrl, 'smarthire_violations')
        } catch {
          // ignore upload failure in panic path
        }
      }
    }

    try {
      await proctoringApi.reportViolation({
        attemptId,
        violationType,
        screenshotUrl,
      })
    } catch {
      // ignore
    }
  }

  if (disabled) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: '180px',
      height: '135px',
      background: '#000',
      borderRadius: '8px',
      border: '2px solid var(--green-dark)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      overflow: 'hidden',
      zIndex: 9999
    }}>
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div style={{ position: 'absolute', bottom: '6px', left: '6px', fontSize: '0.65rem', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px', color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: visionReady ? 'var(--green)' : 'var(--orange)' }} />
        {visionReady ? 'Proctoring Active' : 'Loading AI...'}
      </div>
    </div>
  )
}
