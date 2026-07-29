import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Moon, Sun, Bell, Wifi, Bot, Menu } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/button'
import { useIncidents } from '@/hooks/useIncidents'
import { formatDateShort } from '@/lib/utils'

const ROUTE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of the Emergency Communication System' },
  '/incoming': { title: 'Incoming Communications', subtitle: 'Incident queue from integrated subsystems' },
  '/broadcast': { title: 'Broadcast Alerts', subtitle: 'Create and broadcast emergency notifications' },
  '/logs': { title: 'Communication Logs', subtitle: 'Full history of communications and broadcasts' },
  '/hotlines': { title: 'Emergency Hotlines', subtitle: 'Manage emergency contact numbers for residents' },
  '/settings': { title: 'Settings', subtitle: 'System configuration and preferences' },
}

interface HeaderProps {
  onOpenMobileMenu?: () => void
}

export function Header({ onOpenMobileMenu }: HeaderProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { data: incidents = [] } = useIncidents()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const pendingIncidents = incidents.filter(i => i.status === 'Pending')
  const pendingCount = pendingIncidents.length

  const routeInfo = ROUTE_TITLES[pathname] ?? {
    title: 'Barangay 178 ECS',
    subtitle: 'Emergency Communication System',
  }

  return (
    <header className="h-14 border-b border-border bg-card/80 backdrop-blur-md flex items-center px-3 sm:px-6 gap-2 sm:gap-4 sticky top-0 z-30">
      {/* Mobile Hamburger Menu Toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenMobileMenu}
        className="md:hidden flex-shrink-0"
        title="Open navigation menu"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </Button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-sm sm:text-base font-bold text-foreground font-display truncate">
          {routeInfo.title}
        </h1>
        <p className="text-xs text-muted-foreground hidden sm:block truncate">{routeInfo.subtitle}</p>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Connection Status */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-secondary text-xs font-medium">
          <Wifi className="w-3 h-3 text-primary" />
          <span className="text-muted-foreground">Supabase</span>
          <span className="status-dot online" />
        </div>

        {/* AI Assisted Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 text-xs font-medium">
          <Bot className="w-3 h-3 text-primary" />
          <span className="text-primary font-semibold">AI Assisted</span>
        </div>

        {/* Pending Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            title="Pending Incidents"
          >
            <Bell className="w-4 h-4" />
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </Button>

          {dropdownOpen && (
            <>
              {/* Click outside overlay */}
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              
              {/* Notification Popover */}
              <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-xs sm:w-80 bg-card border border-border rounded-xl shadow-xl z-50 py-2 animate-fade-in">
                <div className="px-4 py-2 border-b border-border flex justify-between items-center bg-muted/20">
                  <span className="text-xs font-bold text-foreground font-display">Pending Incident Reviews</span>
                  <span className="text-[10px] font-semibold bg-destructive/15 text-destructive px-2 py-0.5 rounded-full">
                    {pendingCount} new
                  </span>
                </div>
                
                <div className="max-h-64 overflow-y-auto divide-y divide-border">
                  {pendingIncidents.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                      🎉 All clear! No pending incidents.
                    </div>
                  ) : (
                    pendingIncidents.slice(0, 5).map(inc => (
                      <div
                        key={inc.id}
                        onClick={() => {
                          setDropdownOpen(false)
                          navigate('/incoming', { state: { filterStatus: 'Pending', highlightId: inc.id } })
                        }}
                        className="px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer text-left"
                      >
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[11px] font-mono text-primary font-bold">{inc.incident_id}</span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatDateShort(inc.created_at)}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-foreground mt-0.5 truncate">
                          {inc.incident_type} — {inc.location}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {inc.description}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="px-4 pt-2 border-t border-border mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs gap-1.5"
                    onClick={() => {
                      setDropdownOpen(false)
                      navigate('/incoming', { state: { filterStatus: 'Pending' } })
                    }}
                  >
                    View All Pending Incidents
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-accent" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </Button>

        {/* Current Time */}
        <div className="hidden lg:block text-xs text-muted-foreground font-mono">
          {new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </header>
  )
}
