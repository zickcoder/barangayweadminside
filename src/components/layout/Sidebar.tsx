import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Radio,
  Megaphone,
  FileText,
  Phone,
  Settings,
  LogOut,
  Siren,
  ChevronLeft,
  ChevronRight,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePendingIncidentsCount } from '@/hooks/useIncidents'
import { useState } from 'react'

import { useAuth } from '@/context/AuthContext'
import { LogoutModal } from '@/components/ui/LogoutModal'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/incoming', label: 'Incoming Communications', icon: Radio },
  { path: '/broadcast', label: 'Broadcast Alerts', icon: Megaphone },
  { path: '/logs', label: 'Communication Logs', icon: FileText },
  { path: '/hotlines', label: 'Emergency Hotlines', icon: Phone },
  { path: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { data: pendingCount } = usePendingIncidentsCount()
  const [collapsed, setCollapsed] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false)
    await logout()
    navigate('/login')
  }

  return (
    <>
      <LogoutModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />

      <aside
        className={cn(
          'sidebar relative hidden md:flex flex-col h-full transition-all duration-300 ease-in-out',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo / Brand */}
        <div className={cn(
          'flex items-center gap-3 px-4 py-5 border-b border-border',
          collapsed && 'justify-center px-2'
        )}>
          <div className="flex-shrink-0 w-9 h-9 rounded-xl overflow-hidden shadow-sm bg-primary/10 flex items-center justify-center">
            <img src="/logo.png" alt="Barangay 178" className="w-full h-full object-cover" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-bold text-foreground font-display leading-tight">Barangay 178</p>
              <p className="text-[10px] text-muted-foreground leading-tight">ECS Admin Portal</p>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-16 z-10 w-6 h-6 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
          {!collapsed && (
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Navigation
            </p>
          )}
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              state={null}
              onClick={() => {
                if (window.location.pathname === path) {
                  navigate(path, { replace: true, state: null })
                }
              }}
              className={({ isActive }) =>
                cn('sidebar-item', isActive && 'active', collapsed && 'justify-center px-2')
              }
              title={collapsed ? label : undefined}
            >
              <div className="relative flex-shrink-0">
                <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                {/* Pending badge for Incoming */}
                {path === '/incoming' && (pendingCount ?? 0) > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                    {(pendingCount ?? 0) > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </div>
              {!collapsed && <span className="flex-1">{label}</span>}
              {!collapsed && path === '/incoming' && (pendingCount ?? 0) > 0 && (
                <span className="ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-destructive/15 text-destructive">
                  {pendingCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="px-2 py-4 border-t border-border space-y-1">
          {!collapsed && (
            <div className="px-3 py-3 mb-2 rounded-lg bg-primary/8 border border-primary/15">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bell className="w-3 h-3 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Administrator</p>
                  <p className="text-[10px] text-muted-foreground">Barangay 178</p>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => setShowLogoutModal(true)}
            className={cn(
              'sidebar-item w-full text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer',
              collapsed && 'justify-center px-2'
            )}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut style={{ width: 18, height: 18 }} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  )
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { data: pendingCount } = usePendingIncidentsCount()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false)
    onClose()
    await logout()
    navigate('/login')
  }

  if (!open) return null

  return (
    <>
      <LogoutModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
      />

      <div className="fixed inset-0 z-50 md:hidden flex">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        />

        {/* Drawer */}
        <aside className="relative z-50 w-72 max-w-[85vw] bg-card border-r border-border h-full flex flex-col shadow-2xl animate-slide-in-left">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm bg-primary/10 flex items-center justify-center">
                <img src="/logo.png" alt="Barangay 178" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground font-display leading-tight">Barangay 178</p>
                <p className="text-[10px] text-muted-foreground leading-tight">ECS Admin Portal</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Navigation
            </p>
            {navItems.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                state={null}
                onClick={() => {
                  onClose()
                  if (window.location.pathname === path) {
                    navigate(path, { replace: true, state: null })
                  }
                }}
                className={({ isActive }) => cn('sidebar-item py-3 text-base', isActive && 'active')}
              >
                <div className="relative flex-shrink-0">
                  <Icon className="w-5 h-5" />
                  {path === '/incoming' && (pendingCount ?? 0) > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                      {(pendingCount ?? 0) > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </div>
                <span className="flex-1">{label}</span>
                {path === '/incoming' && (pendingCount ?? 0) > 0 && (
                  <span className="ml-auto px-2 py-0.5 text-xs font-bold rounded-full bg-destructive/15 text-destructive">
                    {pendingCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Bottom */}
          <div className="p-4 border-t border-border space-y-2">
            <div className="px-3 py-3 rounded-xl bg-primary/8 border border-primary/15 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Administrator</p>
                <p className="text-[10px] text-muted-foreground">Barangay 178, Camarin</p>
              </div>
            </div>

            <button
              onClick={() => setShowLogoutModal(true)}
              className="sidebar-item w-full py-3 text-destructive hover:bg-destructive/10 hover:text-destructive flex items-center gap-3 justify-center cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-semibold text-sm">Logout</span>
            </button>
          </div>
        </aside>
      </div>
    </>
  )
}
