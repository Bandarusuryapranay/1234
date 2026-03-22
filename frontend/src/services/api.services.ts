import { api } from '../lib/api'

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me').then((r) => r.data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
}

// ── Admin Dashboard ───────────────────────────────────────────
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard').then((r) => r.data),
  createRecruiter: (data: {
    email: string; firstName: string; lastName: string; department?: string; campaignIds?: string[]
  }) => api.post('/admin/recruiters', data).then((r) => r.data),
  getAllRecruiters: () => api.get('/admin/recruiters').then((r) => r.data),
  getRecruiterById: (id: string) => api.get(`/admin/recruiters/${id}`).then((r) => r.data),
  advanceRound: (candidateId: string) =>
    api.post(`/admin/candidates/${candidateId}/advance-round`).then((r) => r.data),
  rejectCandidate: (candidateId: string, reason?: string) =>
    api.post(`/admin/candidates/${candidateId}/reject`, { reason }).then((r) => r.data),
  updateRecruiter: (id: string, data: Record<string, unknown>) =>
    api.patch(`/admin/recruiters/${id}`, data).then((r) => r.data),
  deleteRecruiter: (id: string) =>
    api.delete(`/admin/recruiters/${id}`).then((r) => r.data),
  removeRecruiterFromCampaign: (recruiterId: string, campaignId: string) =>
    api.delete(`/admin/recruiters/${recruiterId}/campaigns/${campaignId}`).then((r) => r.data),
}

// ── Recruiter ───────────────────────────────────────────────────
export const recruiterApi = {
  getDashboardStats: () => api.get('/recruiter/dashboard/stats').then(r => r.data),
  getMyCampaigns: () => api.get('/recruiter/campaigns').then(r => r.data),
  getCandidates: (campaignId: string) => api.get(`/recruiter/campaigns/${campaignId}/candidates`).then(r => r.data),
  getLiveMonitor: (campaignId: string) => api.get(`/recruiter/campaigns/${campaignId}/monitor`).then(r => r.data),
  addCandidate: (campaignId: string, data: { firstName: string; lastName: string; email: string; phone?: string }) =>
    api.post(`/recruiter/campaigns/${campaignId}/candidates`, data).then(r => r.data),
  addBulkCandidates: (campaignId: string, candidates: { firstName: string; lastName: string; email: string; phone?: string }[]) =>
    api.post(`/recruiter/campaigns/${campaignId}/candidates/bulk`, { candidates }).then(r => r.data),
  editCandidate: (candidateId: string, data: { firstName: string; lastName: string; email?: string; phone?: string }) =>
    api.put(`/recruiter/candidates/${candidateId}`, data).then(r => r.data),
  deleteCandidate: (candidateId: string) =>
    api.delete(`/recruiter/candidates/${candidateId}`).then(r => r.data),
  grantPermission: (candidateId: string) => api.post(`/recruiter/candidates/${candidateId}/grant`).then(r => r.data),
  grantBulkPermission: (candidateIds: string[]) =>
    api.post(`/recruiter/candidates/bulk/grant`, { candidateIds }).then(r => r.data),
  updateCandidateStatus: (candidateId: string, status: string) =>
    api.patch(`/recruiter/candidates/${candidateId}/status`, { status }).then(r => r.data),
  // Scorecard (served by /api/scorecard routes)
  getScorecard: (candidateId: string) => api.get(`/recruiter/candidates/${candidateId}/scorecard`).then(r => r.data),
  saveNotes: (candidateId: string, data: { recruiterNotes?: string; recruiterRating?: number }) =>
    api.patch(`/recruiter/candidates/${candidateId}/notes`, data).then(r => r.data),
  generateScorecard: (candidateId: string) =>
    api.post(`/scorecard/${candidateId}/generate`).then(r => r.data),
  downloadReport: (candidateId: string) =>
    api.get(`/scorecard/${candidateId}/download`, { responseType: 'blob' }).then(r => r.data),
  forwardToAdmin: (candidateId: string) =>
    api.post(`/scorecard/${candidateId}/forward-to-admin`).then(r => r.data),
  exportCampaignExcel: (campaignId: string) =>
    api.get(`/scorecard/campaign/${campaignId}/export-excel`, { responseType: 'blob' }).then(r => r.data),
  reduceStrike: (attemptId: string) =>
    api.patch(`/recruiter/attempts/${attemptId}/reduce-strike`).then(r => r.data),
}

// ── Campaigns ─────────────────────────────────────────────────
export const campaignApi = {
  create: (data: Record<string, unknown>) =>
    api.post('/campaigns', data).then((r) => r.data),
  getAll: () => api.get('/campaigns').then((r) => r.data),
  getOne: (id: string) => api.get(`/campaigns/${id}`).then((r) => r.data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/campaigns/${id}/status`, { status }).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/campaigns/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/campaigns/${id}`).then((r) => r.data),
  assignRecruiter: (campaignId: string, recruiterUserId: string) =>
    api.post(`/campaigns/${campaignId}/assign-recruiter`, { recruiterUserId }).then((r) => r.data),
}

// ── Questions ─────────────────────────────────────────────────
export const questionApi = {
  generatePool: (campaignId: string) =>
    api.post('/questions/generate', { campaignId }).then((r) => r.data),
  getPoolPreview: (campaignId: string) =>
    api.get(`/questions/preview/${campaignId}`).then((r) => r.data),
  approveQuestion: (questionId: string, approved: boolean) =>
    api.patch('/questions/approve', { questionId, approved }).then((r) => r.data),
  bulkApprove: (poolId: string, approve: boolean) =>
    api.patch('/questions/bulk-approve', { poolId, approve }).then((r) => r.data),
  getApprovalStatus: (campaignId: string) =>
    api.get(`/questions/approval-status/${campaignId}`).then((r) => r.data),
}

// ── Candidate ─────────────────────────────────────────────────
export const candidateApi = {
  getProfile: () => api.get('/candidate/profile').then(r => r.data),
  getOnboardingStatus: () => api.get('/candidate/onboarding').then(r => r.data),
  uploadResume: (file: File) => {
    const fd = new FormData()
    fd.append('resume', file)
    return api.post('/candidate/resume', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
  },
  saveFaceIdentity: (data: { descriptor: any; photoUrl: string }) =>
    api.post('/candidate/identity', data).then(r => r.data),
}

// ── Question / Pool ──────────────────────────────────────────
export const questionsApi = {
  getTopics: () => 
    api.get('/questions/topics').then(r => r.data),
  generatePool: (campaignId: string) =>
    api.post('/questions/generate', { campaignId }).then(r => r.data),
}

// ── Assessment / Attempt ──────────────────────────────────────
export const attemptApi = {
  start: (roundId: string) => 
    api.post('/attempt/start', { roundId }).then(r => r.data),
  getQuestions: (attemptId: string) => 
    api.get(`/attempt/${attemptId}/questions`).then(r => r.data),
  submitMCQ: (data: { attemptId: string, questionId: string, selectedOptionId: string, timeTakenSeconds: number }) =>
    api.post('/attempt/submit/mcq', data).then(r => r.data),
  submitCoding: (data: { attemptId: string, questionId: string, sourceCode: string, language: string }) =>
    api.post('/attempt/submit/coding', data).then(r => r.data),
  runCoding: (data: { attemptId: string, questionId: string, sourceCode: string, language: string }) =>
    api.post('/attempt/run/coding', data).then(r => r.data),
  submitInterview: (data: { 
    attemptId: string, 
    questionId: string, 
    mode: 'TEXT' | 'AUDIO', 
    textAnswer?: string, 
    audioUrl?: string, 
    sttTranscript?: string,
    timeTakenSeconds: number 
  }) => api.post('/attempt/submit/interview', data).then(r => r.data),
   submitInterviewAudio: (formData: FormData) =>
    api.post('/attempt/submit/interview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data),
  submitLiveCodingCode: (data: { attemptId: string, questionId: string, sourceCode: string, language: string }) =>
    api.post('/attempt/live-coding/code', data).then(r => r.data),
  submitLiveCodingExplain: (formData: FormData) =>
    api.post('/attempt/live-coding/explain', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  complete: (attemptId: string) =>
    api.post('/attempt/complete', { attemptId }).then(r => r.data),
}

// ── Proctoring ─────────────────────────────────────────────
export const proctoringApi = {
  reportViolation: (data: { attemptId: string, violationType: string, screenshotUrl?: string, mediapipeScore?: number, metadata?: any }) =>
    api.post('/proctoring/violation', data).then(r => r.data),
  getCloudinarySignature: (params: any) =>
    api.get('/proctoring/cloudinary-signature', { params }).then(r => r.data),
}
