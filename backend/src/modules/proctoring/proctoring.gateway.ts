import { Server } from 'socket.io'
import type { Server as HTTPServer } from 'http'
import { verifyAccessToken } from '../../lib/jwt'
import { isTokenBlacklisted } from '../../lib/jwt'

export function initProctoringGateway(httpServer: HTTPServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
    path: '/ws/proctoring',
  })

  // Auth middleware for WebSocket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) return next(new Error('No token'))
      if (await isTokenBlacklisted(token)) return next(new Error('Token revoked'))
      const payload = verifyAccessToken(token)
      socket.data.user = payload
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const user = socket.data.user

    // Recruiter joins campaign room to watch live strikes
    socket.on('join:campaign', (campaignId: string) => {
      if (user.role === 'RECRUITER' || user.role === 'ADMIN') {
        socket.join(`campaign:${campaignId}`)
      }
    })

    // Candidate joins their own room
    socket.on('join:attempt', (attemptId: string) => {
      if (user.role === 'CANDIDATE') {
        socket.join(`attempt:${attemptId}`)
      }
    })

    socket.on('disconnect', () => {})
  })

  return io
}

// Emit strike event to recruiter room — called from proctoring.service
export let proctoringIO: ReturnType<typeof initProctoringGateway> | null = null

export function emitStrikeToRecruiters(campaignId: string, data: any) {
  proctoringIO?.to(`campaign:${campaignId}`).emit('strike:new', data)
}

export function emitTermination(campaignId: string, candidateId: string) {
  proctoringIO?.to(`campaign:${campaignId}`).emit('candidate:terminated', { candidateId })
}
