import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import logo from '../assets/Indium.png'
import { useAuthStore } from '../store/authStore'
import { authApi } from '../services/api.services'
import toast from 'react-hot-toast'
import {
  LayoutDashboard, Briefcase, Users, LogOut, ChevronRight,
  Menu, X, Settings, Shield, Bell, BarChart3, MonitorPlay, BarChart2
} from 'lucide-react'

const navSections = [
  {
    label: 'Overview',
    items: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Talent Operations',
    items: [
      { to: '/admin/candidates-management', icon: Users, label: 'Candidates' },
      { to: '/admin/live-monitor', icon: MonitorPlay, label: 'Live Monitor' },
      { to: '/admin/reports', icon: BarChart2, label: 'Campaign Reports' },
    ],
  },
  {
    label: 'Organization',
    items: [
      { to: '/admin/campaigns', icon: Briefcase, label: 'Campaigns' },
      { to: '/admin/recruiters', icon: Users, label: 'Recruiters' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/admin/analytics', icon: BarChart3, label: 'Global Analytics' },
    ],
  },
  {
    label: 'Platform',
    items: [
      { to: '/admin/settings', icon: Settings, label: 'Settings' },
      { to: '/admin/security', icon: Shield, label: 'Security' },
    ],
  },
]

const PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/candidates-management': 'Candidate Management',
  '/admin/live-monitor': 'Live Assessment Monitor',
  '/admin/reports': 'Campaign Reports',
  '/admin/campaigns': 'Campaigns',
  '/admin/campaigns/new': 'Create Campaign',
  '/admin/recruiters': 'Recruiter Management',
  '/admin/analytics': 'Analytics',
  '/admin/settings': 'System Settings',
  '/admin/security': 'Security',
  '/admin/profile': 'My Profile',
}

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    if (sidebarOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const handleLogout = async () => {
    try { await authApi.logout() } catch {}
    clearAuth()
    navigate('/login')
    toast.success('Logged out successfully')
  }

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : 'AD'

  const pageTitle =
    PAGE_TITLES[location.pathname] ||
    (location.pathname.includes('/questions') ? 'Question Pool' :
     location.pathname.match(/campaigns\/[^/]+$/) ? 'Campaign Detail' : 'Admin')

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ──────────────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <div style={{ background: '#ffffff', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={logo} alt="Logo" style={{ height: '20px', width: 'auto', objectFit: 'contain', display: 'block' }} />
          </div>
          <div>
            <div className="sidebar-logo-text">{import.meta.env.VITE_APP_NAME}</div>
            <div className="sidebar-logo-sub">Proctoring Platform</div>
          </div>
          {/* Close btn on mobile */}
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => setSidebarOpen(false)}
            style={{ marginLeft: 'auto', display: 'none' }}
            id="sidebar-close-btn"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.label} className="sidebar-section">
              <div className="sidebar-section-label">{section.label}</div>
              {section.items.map((item) =>
                (item as { disabled?: boolean }).disabled ? (
                  <div
                    key={item.to}
                    className="nav-item"
                    style={{ opacity: 0.35, cursor: 'not-allowed' }}
                  >
                    <item.icon className="nav-icon" size={18} />
                    <span>{item.label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.6rem', color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: '4px' }}>
                      Soon
                    </span>
                  </div>
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  >
                    <item.icon className="nav-icon" size={18} />
                    <span>{item.label}</span>
                    <ChevronRight size={13} style={{ marginLeft: 'auto', opacity: 0.3 }} />
                  </NavLink>
                )
              )}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" onClick={() => navigate('/admin/profile')} title="View Profile" style={{ cursor: 'pointer' }}>
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">
                {user?.firstName} {user?.lastName}
              </div>
              <div className="sidebar-user-role">{user?.role}</div>
            </div>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); handleLogout(); }} title="Logout">
              <LogOut size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────── */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <button
            className="topbar-hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <div className="topbar-title">{pageTitle}</div>

          <div className="topbar-actions">
            <button className="btn btn-ghost btn-icon" title="Notifications" style={{ position: 'relative' }}>
              <Bell size={18} />
              <span style={{
                position: 'absolute', top: '6px', right: '6px',
                width: '8px', height: '8px', borderRadius: '50%',
                background: 'var(--orange)', border: '2px solid var(--bg-surface)',
              }} />
            </button>
            <div className="sidebar-avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem', cursor: 'pointer' }}
              onClick={() => navigate('/admin/profile')} title="View Profile">
              {initials}
            </div>
          </div>
        </header>

        <div className="page-body">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
