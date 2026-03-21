import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useThemeStore } from './store/themeStore'
import { useEffect } from 'react'
import AdminLayout from './layouts/AdminLayout'
import LoginPage from './pages/auth/LoginPage'
import ForceChangePasswordPage from './pages/auth/ForceChangePasswordPage'
import DashboardPage from './pages/admin/DashboardPage'
import CampaignsPage from './pages/admin/CampaignsPage'
import CreateCampaignPage from './pages/admin/CreateCampaignPage'
import EditCampaignPage from './pages/admin/EditCampaignPage'
import CampaignDetailPage from './pages/admin/CampaignDetailPage'
import RecruitersPage from './pages/admin/RecruitersPage'
import QuestionPoolPage from './pages/admin/QuestionPoolPage'
import ProfilePage from './pages/admin/ProfilePage'
import SettingsPage from './pages/admin/SettingsPage'
import SecurityPage from './pages/admin/SecurityPage'
import AnalyticsPage from './pages/admin/AnalyticsPage'
import RecruiterDetailPage from './pages/admin/RecruiterDetailPage'
import AdminScorecardPage from './pages/admin/AdminScorecardPage'

// Recruiter
import RecruiterLayout from './layouts/RecruiterLayout'
import RecruiterDashboardPage from './pages/recruiter/DashboardPage'
import CandidatesPage from './pages/recruiter/CandidatesPage'
import LiveMonitorPage from './pages/recruiter/LiveMonitorPage'
import ScorecardPage from './pages/recruiter/ScorecardPage'
import ReportsPage from './pages/recruiter/ReportsPage'
import RecruiterProfilePage from './pages/recruiter/ProfilePage'

// Candidate
import PermissionsGatePage from './pages/candidate/PermissionsGatePage'
import ResumeUploadPage from './pages/candidate/ResumeUploadPage'
import LobbyPage from './pages/candidate/LobbyPage'
import AssessmentLayout from './pages/candidate/AssessmentLayout'
import RoundDispatcher from './pages/candidate/RoundDispatcher'
import CompletePage from './pages/candidate/CompletePage'
import TerminatedPage from './pages/candidate/TerminatedPage'
import IdentityVerificationPage from './pages/candidate/IdentityVerificationPage'

function ProtectedRoute({ children, allowedRole, allowPendingPassword }: { children: React.ReactNode; allowedRole?: string; allowPendingPassword?: boolean }) {
  const { user, accessToken } = useAuthStore()
  if (!accessToken || !user) return <Navigate to="/login" replace />
  
  // Custom: if Candidate is new, direct them to permissions first, THEN password check
  if (user.role === 'CANDIDATE') {
    const hasPerms = sessionStorage.getItem('permissions_granted')
    if (user.mustChangePassword) {
       // if they must change password, but haven't granted perms, go to perms
       if (!allowPendingPassword && !hasPerms) return <Navigate to="/candidate/permissions" replace />
       // if they have granted perms, they should be changing password
       if (!allowPendingPassword) return <Navigate to="/force-change-password" replace />
    }
  } else {
    // Non-candidates must change password immediately
    if (user.mustChangePassword && !allowPendingPassword) return <Navigate to="/force-change-password" replace />
  }

  if (allowedRole && user.role !== allowedRole) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { user } = useAuthStore()
  const { theme } = useThemeStore()

  useEffect(() => {
    // Only apply user-selected theme if logged in
    const targetTheme = user ? theme : 'dark'
    document.documentElement.setAttribute('data-theme', targetTheme)
  }, [user, theme])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/force-change-password" element={<ProtectedRoute allowPendingPassword><ForceChangePasswordPage /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRole="ADMIN">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard"                     element={<DashboardPage />} />
        <Route path="campaigns"                     element={<CampaignsPage />} />
        <Route path="campaigns/new"                 element={<CreateCampaignPage />} />
        <Route path="campaigns/:id/edit"            element={<EditCampaignPage />} />
        <Route path="campaigns/:id"                 element={<CampaignDetailPage />} />
        <Route path="campaigns/:id/questions"       element={<QuestionPoolPage />} />
        <Route path="recruiters"                    element={<RecruitersPage />} />
        <Route path="recruiters/:id"                 element={<RecruiterDetailPage />} />
        <Route path="analytics"                      element={<AnalyticsPage />} />
        
        {/* Unified Talent Operations for Admin */}
        <Route path="candidates-management"          element={<CandidatesPage />} />
        <Route path="live-monitor"                   element={<LiveMonitorPage />} />
        <Route path="reports"                        element={<ReportsPage />} />
        <Route path="candidates/:candidateId"         element={<AdminScorecardPage />} />
        
        <Route path="profile"                       element={<ProfilePage />} />
        <Route path="settings"                      element={<SettingsPage />} />
        <Route path="security"                      element={<SecurityPage />} />
      </Route>

      {/* Recruiter routes */}
      <Route
        path="/recruiter"
        element={
          <ProtectedRoute allowedRole="RECRUITER">
            <RecruiterLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/recruiter/dashboard" replace />} />
        <Route path="dashboard" element={<RecruiterDashboardPage />} />
        <Route path="candidates" element={<CandidatesPage />} />
        <Route path="monitor" element={<LiveMonitorPage />} />
        <Route path="scorecard/:candidateId" element={<ScorecardPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="profile" element={<RecruiterProfilePage />} />
        <Route path="security" element={<SecurityPage />} />
      </Route>

      {/* Candidate routes */}
      <Route path="/candidate/permissions" element={<ProtectedRoute allowedRole="CANDIDATE" allowPendingPassword><PermissionsGatePage /></ProtectedRoute>} />
      <Route path="/candidate/identity-verification" element={<ProtectedRoute allowedRole="CANDIDATE"><IdentityVerificationPage /></ProtectedRoute>} />
      <Route path="/candidate/resume-upload" element={<ProtectedRoute allowedRole="CANDIDATE"><ResumeUploadPage /></ProtectedRoute>} />
      <Route path="/candidate/lobby" element={<ProtectedRoute allowedRole="CANDIDATE"><LobbyPage /></ProtectedRoute>} />
      
      <Route path="/candidate/assessment" element={<ProtectedRoute allowedRole="CANDIDATE"><AssessmentLayout /></ProtectedRoute>}>
        <Route path=":roundId" element={<RoundDispatcher />} />
      </Route>

      <Route path="/candidate/complete" element={<ProtectedRoute allowedRole="CANDIDATE"><CompletePage /></ProtectedRoute>} />
      <Route path="/candidate/terminated" element={<ProtectedRoute allowedRole="CANDIDATE"><TerminatedPage /></ProtectedRoute>} />
      
      {/* Root redirect */}
      <Route path="/" element={<Navigate to={`/${useAuthStore()?.user?.role?.toLowerCase() || 'login'}`} replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
