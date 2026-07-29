import { useNavigate } from 'react-router-dom'
import {
  Megaphone, AlertTriangle, Radio, CheckCircle2,
  Flame, Droplets, Shield, Heart, Mountain, Activity,
  TrendingUp, ArrowUpRight, Wifi, Bot, Server,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SkeletonCard } from '@/components/ui/skeleton'
import { StatusBadge, PriorityBadge, AlertPriorityBadge } from '@/components/shared/StatusBadge'
import { useAlerts, useAlertStats } from '@/hooks/useAlerts'
import { useIncidents, usePendingIncidentsCount } from '@/hooks/useIncidents'
import { getGreeting, formatDateShort, incidentTypeColor } from '@/lib/utils'

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts()
  const { data: incidents = [], isLoading: incidentsLoading } = useIncidents()
  const { data: stats, isLoading: statsLoading } = useAlertStats('month')
  const { data: pendingCount = 0 } = usePendingIncidentsCount()

  const greeting = getGreeting()
  const recentAlerts = alerts.slice(0, 5)
  const latestAlert = alerts[0]

  return (
    <div className="space-y-6">

      {/* Welcome Card */}
      <div className="welcome-card rounded-2xl p-4 sm:p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white blur-3xl -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white blur-3xl translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-white/70 text-xs sm:text-sm font-medium">{greeting},</p>
              <h2 className="text-xl sm:text-2xl font-bold font-display mt-0.5">Administrator</h2>
              <p className="text-white/60 text-xs sm:text-sm mt-1">Barangay 178 Emergency Communication System</p>
              <p className="text-white/50 text-[11px] sm:text-xs mt-0.5">Camarin, Caloocan City</p>
            </div>
            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t border-white/10 sm:border-0">
              <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-xs">
                <span className="status-dot online" />
                <span>System Operational</span>
              </div>
              {pendingCount > 0 && (
                <button
                  onClick={() => navigate('/incoming', { state: { filterStatus: 'Pending' } })}
                  className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-xs text-orange-200 border border-orange-300/30 hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <AlertTriangle className="w-3 h-3" />
                  <span>{pendingCount} pending incident{pendingCount > 1 ? 's' : ''}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              label="Today's Broadcasts"
              value={stats?.today ?? 0}
              icon={<Megaphone className="w-4 h-4 sm:w-5 sm:h-5" />}
              color="primary"
              trend="+2 from yesterday"
              onClick={() => navigate('/logs', { state: { tab: 'broadcast', filterDate: 'TODAY' } })}
            />
            <StatCard
              label="This Month's Broadcasts"
              value={stats?.month ?? 0}
              icon={<Activity className="w-4 h-4 sm:w-5 sm:h-5" />}
              color="accent"
              trend="Active month"
              onClick={() => navigate('/logs', { state: { tab: 'broadcast', filterDate: 'MONTH' } })}
            />
            <StatCard
              label="Total Alerts Sent"
              value={stats?.total ?? 0}
              icon={<CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />}
              color="success"
              trend="All time"
              onClick={() => navigate('/logs', { state: { tab: 'broadcast', filterDate: 'ALL' } })}
            />
            <StatCard
              label="Pending Incidents"
              value={pendingCount}
              icon={<AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />}
              color={pendingCount > 0 ? 'danger' : 'muted'}
              trend={pendingCount > 0 ? 'Requires attention' : 'All clear'}
              onClick={() => navigate('/incoming', { state: { filterStatus: 'Pending' } })}
            />
          </>
        )}
      </div>

      {/* Received Communications Incidents Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-semibold font-display text-foreground">Received Communications Incidents</h3>
          <button
            onClick={() => navigate('/incoming')}
            className="text-xs text-primary hover:underline font-medium"
          >
            View All Queue →
          </button>
        </div>

        <Card>
          <CardContent className="p-0">
            {incidentsLoading ? (
              <div className="p-6">
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="skeleton h-8 w-full rounded" />
                  ))}
                </div>
              </div>
            ) : incidents.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-xs sm:text-sm">
                No received incidents found
              </div>
            ) : (
              <>
                {/* Mobile View: Card Stack (< md) */}
                <div className="block md:hidden divide-y divide-border">
                  {incidents.slice(0, 8).map(inc => (
                    <div
                      key={inc.id}
                      onClick={() => navigate('/incoming', { state: { highlightId: inc.id } })}
                      className="p-3.5 hover:bg-muted/40 transition-colors cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-primary font-semibold">{inc.incident_id}</span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              background: `${incidentTypeColor(inc.incident_type)}18`,
                              color: incidentTypeColor(inc.incident_type),
                            }}
                          >
                            {inc.incident_type}
                          </span>
                          <PriorityBadge priority={inc.priority} />
                        </div>
                      </div>

                      <div className="flex justify-between items-start text-xs gap-2">
                        <span className="text-foreground font-medium truncate">{inc.location}</span>
                        <span className="text-muted-foreground text-[10px] whitespace-nowrap">{formatDateShort(inc.created_at)}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-muted-foreground">{inc.source_subsystem}</span>
                        <StatusBadge status={inc.status} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View: Table (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {['Incident ID', 'Source', 'Type', 'Priority', 'Location', 'Received Time', 'Status'].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {incidents.slice(0, 8).map(inc => (
                        <tr
                          key={inc.id}
                          onClick={() => navigate('/incoming', { state: { highlightId: inc.id } })}
                          className="border-b border-border last:border-0 table-row-hover transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-primary font-semibold">{inc.incident_id}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground">{inc.source_subsystem}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                background: `${incidentTypeColor(inc.incident_type)}18`,
                                color: incidentTypeColor(inc.incident_type),
                              }}
                            >
                              {inc.incident_type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <PriorityBadge priority={inc.priority} />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-foreground max-w-[160px] truncate block" title={inc.location}>
                              {inc.location}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDateShort(inc.created_at)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={inc.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Broadcasts */}
        <Card 
          onClick={() => navigate('/logs', { state: { tab: 'broadcast' } })}
          className="lg:col-span-2 cursor-pointer hover:border-primary/40 transition-colors"
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Recent Broadcasts</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="skeleton h-3 w-3/4 rounded" />
                    <div className="skeleton h-2 w-1/2 rounded" />
                  </div>
                ))}
              </div>
            ) : recentAlerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No broadcasts yet</p>
            ) : (
              <div className="space-y-3">
                {recentAlerts.map(alert => (
                  <div key={alert.id} className="flex gap-3 group">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{alert.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <AlertPriorityBadge priority={alert.priority} />
                        <span className="text-[10px] text-muted-foreground">
                          {formatDateShort(alert.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Status */}
        <Card 
          onClick={() => navigate('/settings')}
          className="cursor-pointer hover:border-primary/40 transition-colors"
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">System Status</CardTitle>
              <Server className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <SystemStatusRow
              label="Supabase Connected"
              icon={<Wifi className="w-4 h-4" />}
              status="online"
            />
            <SystemStatusRow
              label="API Listener Running"
              icon={<Activity className="w-4 h-4" />}
              status="online"
            />
            <SystemStatusRow
              label="Gemini AI Status"
              icon={<Bot className="w-4 h-4" />}
              status={import.meta.env.VITE_GEMINI_API_KEY && import.meta.env.VITE_GEMINI_API_KEY !== 'your_gemini_api_key_here' ? 'online' : 'warning'}
            />

            {/* Latest Alert */}
            {latestAlert && (
              <div className="pt-3 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                  <ArrowUpRight className="w-3 h-3" />
                  Latest Emergency Alert
                </p>
                <div className="p-3 rounded-lg bg-muted/50 space-y-1.5">
                  <p className="text-xs font-semibold text-foreground">{latestAlert.title}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{latestAlert.preview}</p>
                  <div className="flex items-center gap-2 pt-1">
                    <AlertPriorityBadge priority={latestAlert.priority} />
                    <span className="text-[10px] text-muted-foreground">
                      {formatDateShort(latestAlert.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
  trend,
  onClick,
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: 'primary' | 'accent' | 'success' | 'danger' | 'muted'
  trend: string
  onClick?: () => void
}) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/10 text-accent',
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
    danger: 'bg-destructive/10 text-destructive',
    muted: 'bg-muted text-muted-foreground',
  }

  return (
    <div 
      onClick={onClick}
      className={`stat-card ${onClick ? 'cursor-pointer hover:border-primary/40 transition-colors' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold font-display text-foreground mt-1">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{trend}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function SystemStatusRow({
  label,
  icon,
  status,
}: {
  label: string
  icon: React.ReactNode
  status: 'online' | 'offline' | 'warning'
}) {
  const statusLabel = {
    online: 'Operational',
    offline: 'Offline',
    warning: 'Not Configured',
  }

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground">{statusLabel[status]}</p>
      </div>
      <span className={`status-dot ${status}`} />
    </div>
  )
}
