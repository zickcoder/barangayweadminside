import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Megaphone, AlertTriangle, CheckCircle2, Activity,
  TrendingUp, ArrowUpRight, Wifi, Bot, Server,
  Smartphone, Flame, Droplets, ShieldAlert, HeartPulse, Waves, HelpCircle,
  FileText, Printer
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { SkeletonCard } from '@/components/ui/skeleton'
import { AlertPriorityBadge } from '@/components/shared/StatusBadge'
import { PrintReportModal } from '@/components/shared/PrintReportModal'
import { useAlerts } from '@/hooks/useAlerts'
import { usePendingIncidentsCount } from '@/hooks/useIncidents'
import { useAuth } from '@/context/AuthContext'
import { getGreeting, formatDateShort, formatDate } from '@/lib/utils'
import { supabase } from '@/services/supabase'
import type { Alert, TimeFilter } from '@/types'

// ─── Color Palette ────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  FIRE:       '#ef4444',
  FLOOD:      '#3b82f6',
  CRIME:      '#8b5cf6',
  MEDICAL:    '#ec4899',
  EARTHQUAKE: '#f97316',
  OTHER:      '#6b7280',
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  FIRE:       <Flame className="w-3.5 h-3.5" />,
  FLOOD:      <Droplets className="w-3.5 h-3.5" />,
  CRIME:      <ShieldAlert className="w-3.5 h-3.5" />,
  MEDICAL:    <HeartPulse className="w-3.5 h-3.5" />,
  EARTHQUAKE: <Waves className="w-3.5 h-3.5" />,
  OTHER:      <HelpCircle className="w-3.5 h-3.5" />,
}

// Helper to format Date as YYYY-MM-DD in local time (prevents UTC timezone offset bugs)
const formatLocalDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// ─── Live Real-Time KPIs & Analytics Hook ──────────────────────────────────────
function useLiveDashboardData(timeFilter: TimeFilter, incidentTypeFilter: 'today' | 'week' | 'month' | 'year') {
  const [loading, setLoading] = useState(true)

  const [allAlerts, setAllAlerts] = useState<Alert[]>([])
  const [allIncidents, setAllIncidents] = useState<Array<{
    id: string
    incident_type: string
    priority: string
    status: string
    created_at: string
  }>>([])

  const fetchData = useCallback(async () => {
    try {
      const [alertsRes, incidentsRes] = await Promise.all([
        supabase.from('alerts').select('*').order('created_at', { ascending: false }),
        supabase.from('incoming_incidents').select('id, incident_type, priority, status, created_at'),
      ])

      setAllAlerts(alertsRes.data || [])
      setAllIncidents(incidentsRes.data || [])
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Real-Time Supabase subscriptions for live updates without page refresh
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-live-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incoming_incidents' }, () => fetchData())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  // Computed Real-Time Metrics & Charts based on Time Filter
  const computed = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

    // Filter threshold for historical charts
    let filterStart = 0
    if (timeFilter === 'week') {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      d.setHours(0, 0, 0, 0)
      filterStart = d.getTime()
    } else if (timeFilter === 'month') {
      filterStart = monthStart
    } else {
      filterStart = new Date(now.getFullYear(), 0, 1).getTime()
    }

    // Filtered alerts for the selected period
    const filteredAlerts = allAlerts.filter(a => new Date(a.created_at).getTime() >= filterStart)

    // Accurate Counts
    const todayCount = allAlerts.filter(a => new Date(a.created_at).getTime() >= todayStart).length
    const monthCount = allAlerts.filter(a => new Date(a.created_at).getTime() >= monthStart).length
    const totalAlertsCount = allAlerts.length

    // Status counts
    const pendingIncidents = allIncidents.filter(i => i.status === 'Pending').length
    const broadcastedIncidents = allIncidents.filter(i => i.status === 'Broadcasted').length
    const disregardedIncidents = allIncidents.filter(i => i.status === 'Disregarded').length
    const seenIncidents = allIncidents.filter(i => i.status === 'Seen').length

    // Priority Distribution: strictly THIS MONTH with label (as requested)
    const monthAlerts = allAlerts.filter(a => new Date(a.created_at).getTime() >= monthStart)
    let monthEmergencyCount = 0
    let monthNormalNotifCount = 0
    monthAlerts.forEach(a => {
      const p = a.priority?.toUpperCase()
      if (p === 'EMERGENCY') {
        monthEmergencyCount++
      } else {
        monthNormalNotifCount++
      }
    })
    const priorityData = [
      { name: 'Emergency Notification', key: 'EMERGENCY', count: monthEmergencyCount, color: '#ef4444' },
      { name: 'Notification', key: 'WARNING', count: monthNormalNotifCount, color: '#f97316' },
    ]

    // Emergency Type Distribution based on incidentTypeFilter (today, week, month, year)
    let typeStart = 0
    if (incidentTypeFilter === 'today') {
      typeStart = todayStart
    } else if (incidentTypeFilter === 'week') {
      const d = new Date(now)
      d.setDate(d.getDate() - 7)
      d.setHours(0, 0, 0, 0)
      typeStart = d.getTime()
    } else if (incidentTypeFilter === 'month') {
      typeStart = monthStart
    } else {
      typeStart = new Date(now.getFullYear(), 0, 1).getTime()
    }

    const typeFilteredAlerts = allAlerts.filter(a => new Date(a.created_at).getTime() >= typeStart)

    const typeCounts: Record<string, number> = {
      FIRE: 0, FLOOD: 0, CRIME: 0, MEDICAL: 0, EARTHQUAKE: 0, OTHER: 0
    }
    typeFilteredAlerts.forEach(a => {
      const t = (a.emergency_type || 'OTHER').toUpperCase()
      if (typeCounts[t] !== undefined) typeCounts[t]++
      else typeCounts.OTHER++
    })
    const typeData = Object.entries(typeCounts)
      .map(([name, count]) => ({
        name,
        count,
        color: TYPE_COLORS[name] || '#6b7280',
      }))
      .filter(item => item.count > 0 || typeFilteredAlerts.length === 0)

    // Build Time-Series Trend Data with LOCAL date matching
    const trendMap = new Map<string, { label: string; date: string; alerts: number; incidents: number; timestamp: number }>()

    if (timeFilter === 'week') {
      // 7 consecutive days up to today
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const key = formatLocalDateKey(d)
        const label = d.toLocaleDateString('en-PH', { weekday: 'short', month: 'numeric', day: 'numeric' })
        trendMap.set(key, { label, date: key, alerts: 0, incidents: 0, timestamp: d.getTime() })
      }
    } else if (timeFilter === 'month') {
      // Days of this month up to today
      const daysInMonth = now.getDate()
      for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), i)
        const key = formatLocalDateKey(d)
        const label = d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
        trendMap.set(key, { label, date: key, alerts: 0, incidents: 0, timestamp: d.getTime() })
      }
    } else {
      // Months of current year up to current month
      for (let m = 0; m <= now.getMonth(); m++) {
        const d = new Date(now.getFullYear(), m, 1)
        const key = `${now.getFullYear()}-${String(m + 1).padStart(2, '0')}`
        const label = d.toLocaleDateString('en-PH', { month: 'short' })
        trendMap.set(key, { label, date: key, alerts: 0, incidents: 0, timestamp: d.getTime() })
      }
    }

    // Populate alerts in trendMap using local date key
    allAlerts.forEach(a => {
      const dt = new Date(a.created_at)
      if (dt.getTime() >= filterStart) {
        const key = timeFilter === 'year'
          ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
          : formatLocalDateKey(dt)
        const entry = trendMap.get(key)
        if (entry) {
          entry.alerts += 1
        }
      }
    })

    // Populate incidents in trendMap using local date key
    allIncidents.forEach(inc => {
      const dt = new Date(inc.created_at)
      if (dt.getTime() >= filterStart) {
        const key = timeFilter === 'year'
          ? `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
          : formatLocalDateKey(dt)
        const entry = trendMap.get(key)
        if (entry) {
          entry.incidents += 1
        }
      }
    })

    const chartTrendData = Array.from(trendMap.values())

    // Incident Status Drill-Down
    const incidentStatusData = [
      { name: 'Pending', count: pendingIncidents, color: '#f59e0b' },
      { name: 'Broadcasted', count: broadcastedIncidents, color: '#22c55e' },
      { name: 'Seen', count: seenIncidents, color: '#3b82f6' },
      { name: 'Disregarded', count: disregardedIncidents, color: '#6b7280' },
    ]

    return {
      todayCount,
      monthCount,
      totalAlertsCount,
      pendingIncidents,
      priorityData,
      typeData,
      chartTrendData,
      incidentStatusData,
      filteredCount: filteredAlerts.length,
      allIncidentsCount: allIncidents.length,
      resolvedCount: broadcastedIncidents + seenIncidents,
    }
  }, [allAlerts, allIncidents, timeFilter, incidentTypeFilter])

  return {
    loading,
    refetch: fetchData,
    allAlerts,
    ...computed,
  }
}

// ─── Main Dashboard Component ─────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate()
  const { adminEmail } = useAuth()
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('month')
  const [incidentTypeFilter, setIncidentTypeFilter] = useState<'today' | 'week' | 'month' | 'year'>('month')
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [showPrintModal, setShowPrintModal] = useState(false)

  const { data: pendingCount = 0 } = usePendingIncidentsCount()
  const { data: mobileAlerts = [] } = useAlerts()

  const {
    loading,
    allAlerts,
    todayCount,
    monthCount,
    totalAlertsCount,
    priorityData,
    typeData,
    chartTrendData,
    incidentStatusData,
    filteredCount,
    allIncidentsCount = 0,
    resolvedCount = 0,
  } = useLiveDashboardData(timeFilter, incidentTypeFilter)

  const greeting = getGreeting()
  const latestAlert = allAlerts[0] || mobileAlerts[0]

  return (
    <div className="space-y-6">

      {/* ── Welcome Banner ────────────────────────────────────────────────────── */}
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
            {pendingCount > 0 && (
              <div className="flex items-center">
                <button
                  onClick={() => navigate('/incoming', { state: { filterStatus: 'Pending' } })}
                  className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-orange-200 border border-orange-300/30 hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
                  <span>{pendingCount} pending incident{pendingCount > 1 ? 's' : ''}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Primary KPI Summary Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard
              label="Today's Broadcasts"
              value={todayCount}
              icon={<Megaphone className="w-4 h-4 sm:w-5 sm:h-5" />}
              color="primary"
              trend={`+${todayCount} sent since 12:00 AM`}
              onClick={() => navigate('/logs', { state: { tab: 'broadcast', filterDate: 'TODAY' } })}
            />
            <StatCard
              label="This Month"
              value={monthCount}
              icon={<Activity className="w-4 h-4 sm:w-5 sm:h-5" />}
              color="accent"
              trend="Total broadcasts this month"
              onClick={() => navigate('/logs', { state: { tab: 'broadcast', filterDate: 'MONTH' } })}
            />
            <StatCard
              label="Total Alerts Sent"
              value={totalAlertsCount}
              icon={<CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />}
              color="success"
              trend="All-time verified alerts"
              onClick={() => navigate('/logs', { state: { tab: 'broadcast', filterDate: 'ALL' } })}
            />
            <StatCard
              label="Pending Incidents"
              value={pendingCount}
              icon={<AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />}
              color={pendingCount > 0 ? 'danger' : 'muted'}
              trend={pendingCount > 0 ? 'Action required immediately' : 'All incidents resolved'}
              onClick={() => navigate('/incoming', { state: { filterStatus: 'Pending' } })}
            />
          </>
        )}
      </div>

      {/* ── Latest Emergency Alert Ribbon ────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold font-display uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            Latest Broadcast Emergency Alert
          </h3>
          {latestAlert && (
            <button
              onClick={() => navigate('/logs', { state: { tab: 'broadcast' } })}
              className="text-xs text-primary hover:underline font-medium cursor-pointer"
            >
              View Full Communication Logs →
            </button>
          )}
        </div>

        {latestAlert ? (
          <div
            onClick={() => setSelectedAlert(latestAlert)}
            className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-destructive/10 via-card to-card border-2 border-destructive/30 shadow-lg relative overflow-hidden cursor-pointer hover:border-destructive/60 hover:shadow-xl transition-all duration-200 active:scale-[0.99] group"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center justify-center flex-shrink-0 text-destructive mt-0.5 group-hover:scale-105 transition-transform">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm sm:text-base font-bold text-foreground font-display group-hover:text-primary transition-colors">
                      {latestAlert.title}
                    </h4>
                    <AlertPriorityBadge priority={latestAlert.priority} />
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                      {latestAlert.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {latestAlert.message}
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1 border-t sm:border-0 border-border/50 pt-2 sm:pt-0 text-[11px] text-muted-foreground whitespace-nowrap">
                <span className="font-medium text-foreground">{formatDateShort(latestAlert.created_at)}</span>
                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Active In App
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-muted/30 border border-border text-center text-xs text-muted-foreground">
            No emergency alerts broadcasted yet.
          </div>
        )}
      </div>

      {/* ── Time Filter Controls for Analytics & Historical Reports ───────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2">
        <div>
          <h3 className="text-sm sm:text-base font-bold font-display text-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Interactive Analytics &amp; Historical Reports
          </h3>
          <p className="text-xs text-muted-foreground">
            Dynamic drill-down metrics filtered by your chosen time frame
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Official Print / Save to PDF Button */}
          <Button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="h-8 px-3 text-xs font-bold bg-card hover:bg-muted text-foreground border border-border rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            title="Print or Save Analytics & Historical Reports as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-primary" />
            <span>Print / Save PDF</span>
          </Button>

          <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border">
            {(['week', 'month', 'year'] as TimeFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  timeFilter === filter
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {filter === 'week' ? 'Last 7 Days' : filter === 'month' ? 'This Month' : 'This Year'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Chart Section 1: Broadcast & Incident Volume Trends ────────────────── */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                Communication Activity Trend ({timeFilter === 'week' ? 'Last 7 Days' : timeFilter === 'month' ? 'Day-by-Day' : 'Monthly'})
              </CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Displays daily broadcast volume over time ({filteredCount} total alerts in period)
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-primary font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" /> Broadcasts Sent
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Incoming Incidents
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-56 skeleton rounded-xl" />
          ) : chartTrendData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">
              No activity recorded in this period.
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="alertColorGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="incidentColorGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="alerts"
                    name="Broadcasts"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    fill="url(#alertColorGrad)"
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="incidents"
                    name="Incoming Incidents"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#incidentColorGrad)"
                    dot={{ fill: '#f59e0b', strokeWidth: 0, r: 2.5 }}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Chart Section 2: Distribution by Priority & Emergency Category ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Priority Breakdown Bar Chart (Clickable -> Filters Broadcast Logs for This Month) */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  Broadcasts by Priority Level (This Month)
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  This month's priority distribution · Click a bar to filter logs
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border cursor-pointer transition-colors"
                  title="Print / Save Broadcasts by Priority Level to PDF"
                >
                  <Printer className="w-3 h-3 text-primary" />
                  <span className="hidden sm:inline">Print / PDF</span>
                </button>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  This Month
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-44 skeleton rounded-xl" />
            ) : (
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData} margin={{ top: 8, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(v: any) => [`${v ?? 0} broadcast${v !== 1 ? 's' : ''}`, 'Count']}
                    />
                    <Bar
                      dataKey="count"
                      radius={[6, 6, 0, 0]}
                      className="cursor-pointer"
                      onClick={(entry: any) => {
                        const targetKey = entry?.key || (entry?.name?.includes('Emergency') ? 'EMERGENCY' : 'WARNING')
                        navigate('/logs', { state: { tab: 'broadcast', filterNotifType: targetKey, filterDate: 'MONTH' } })
                      }}
                    >
                      {priorityData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            navigate('/logs', { state: { tab: 'broadcast', filterNotifType: entry.key, filterDate: 'MONTH' } })
                          }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Donut & Breakdown (Clickable -> Filters Broadcast Logs with selected time option) */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  Alerts by Incident Type
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Click any category to filter Broadcast Alerts Log
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border cursor-pointer transition-colors"
                  title="Print / Save Alerts by Incident Type to PDF"
                >
                  <Printer className="w-3 h-3 text-primary" />
                  <span className="hidden sm:inline">Print / PDF</span>
                </button>

                {/* Time filter options for Incident Type */}
                <div className="flex items-center gap-0.5 bg-muted p-0.5 rounded-lg border border-border">
                  {[
                    { key: 'today', label: 'Today' },
                    { key: 'week',  label: 'This Week' },
                    { key: 'month', label: 'This Month' },
                    { key: 'year',  label: 'This Year' },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setIncidentTypeFilter(opt.key as any)}
                      className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                        incidentTypeFilter === opt.key
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-44 skeleton rounded-xl" />
            ) : typeData.every(t => t.count === 0) ? (
              <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
                No categorized alerts found for this filter.
              </div>
            ) : (
              <div className="flex items-center gap-4 h-44">
                <div className="w-36 h-36 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="count"
                        className="cursor-pointer"
                        onClick={(entry: any) => {
                          if (entry && entry.name) {
                            const dateParam = incidentTypeFilter === 'today' ? 'TODAY'
                              : incidentTypeFilter === 'week' ? 'WEEK'
                              : incidentTypeFilter === 'month' ? 'MONTH'
                              : 'YEAR'
                            navigate('/logs', { state: { tab: 'broadcast', filterType: entry.name, filterDate: dateParam } })
                          }
                        }}
                      >
                        {typeData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={entry.color}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => {
                              const dateParam = incidentTypeFilter === 'today' ? 'TODAY'
                                : incidentTypeFilter === 'week' ? 'WEEK'
                                : incidentTypeFilter === 'month' ? 'MONTH'
                                : 'YEAR'
                              navigate('/logs', { state: { tab: 'broadcast', filterType: entry.name, filterDate: dateParam } })
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(v: any) => [`${v ?? 0} alert${v !== 1 ? 's' : ''}`, ''] as any}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-2 overflow-y-auto max-h-36 pr-1">
                  {typeData.map((t) => (
                    <div
                      key={t.name}
                      onClick={() => {
                        const dateParam = incidentTypeFilter === 'today' ? 'TODAY'
                          : incidentTypeFilter === 'week' ? 'WEEK'
                          : incidentTypeFilter === 'month' ? 'MONTH'
                          : 'YEAR'
                        navigate('/logs', { state: { tab: 'broadcast', filterType: t.name, filterDate: dateParam } })
                      }}
                      className="flex items-center justify-between p-1.5 rounded-lg bg-muted/40 border border-border hover:bg-muted hover:border-primary/40 cursor-pointer transition-colors text-xs group"
                      title={`Filter ${t.name} alerts in Broadcast Alerts Log (${incidentTypeFilter})`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span style={{ color: t.color }}>{TYPE_ICONS[t.name] || <HelpCircle className="w-3.5 h-3.5" />}</span>
                        <span className="text-muted-foreground font-medium truncate group-hover:text-primary transition-colors">{t.name}</span>
                      </div>
                      <span className="font-bold text-foreground ml-1.5">{t.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── Historical Reports & Infrastructure Status Panel ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Historical Highlights & Resolution */}
        <Card className="lg:col-span-2 border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Historical Incident Handling &amp; Resolution
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Detailed status breakdown of community emergency transmissions
                </p>
              </div>
              <button
                onClick={() => navigate('/logs', { state: { tab: 'broadcast' } })}
                className="text-xs text-primary hover:underline font-medium cursor-pointer"
              >
                Full Logs →
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status breakdown boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {incidentStatusData.map((s) => (
                <div key={s.name} className="p-3 rounded-xl bg-muted/40 border border-border">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                    {s.name}
                  </span>
                  <p className="text-xl font-bold font-display mt-0.5" style={{ color: s.color }}>
                    {s.count}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {s.name === 'Broadcasted' ? 'Escalated to app' : s.name === 'Pending' ? 'Needs review' : 'Handled'}
                  </p>
                </div>
              ))}
            </div>

            {/* Recent Broadcast History List */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Recent Broadcast Records ({allAlerts.length} total)
              </span>
              {allAlerts.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No broadcasts available.</p>
              ) : (
                <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card">
                  {allAlerts.slice(0, 5).map((a) => (
                    <div
                      key={a.id}
                      onClick={() => setSelectedAlert(a)}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: a.priority?.toUpperCase() === 'EMERGENCY' ? '#ef4444' : '#f97316' }}
                        />
                        <div className="truncate">
                          <p className="text-xs font-semibold text-foreground truncate">{a.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{a.preview}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <AlertPriorityBadge priority={a.priority} />
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDateShort(a.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System & Infrastructure Panel */}
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Server className="w-4 h-4 text-muted-foreground" />
                Infrastructure &amp; Health
              </CardTitle>
              <button
                onClick={() => navigate('/settings')}
                className="text-xs text-primary hover:underline cursor-pointer"
              >
                Settings
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <SystemStatusRow label="Database Engine" icon={<Wifi className="w-4 h-4" />} status="online" />
            <SystemStatusRow label="AI Tagalog/English/Taglish" icon={<Bot className="w-4 h-4" />} status="online" />
            <SystemStatusRow label="Emergency Notification Channel" icon={<Smartphone className="w-4 h-4" />} status="online" />

            {latestAlert && (
              <div className="pt-3 border-t border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <ArrowUpRight className="w-3 h-3 text-primary" />
                  Active Incident On Air
                </p>
                <div
                  onClick={() => setSelectedAlert(latestAlert)}
                  className="p-2.5 rounded-lg bg-muted/50 border border-border hover:bg-muted cursor-pointer transition-colors"
                >
                  <p className="text-xs font-semibold text-foreground truncate">{latestAlert.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <AlertPriorityBadge priority={latestAlert.priority} />
                    <span className="text-[10px] text-muted-foreground">{formatDateShort(latestAlert.created_at)}</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── Alert Detail Modal Dialog ────────────────────────────────────────── */}
      <Dialog open={!!selectedAlert} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        {selectedAlert && (
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center justify-center flex-shrink-0 text-destructive">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold font-display flex items-center gap-2 flex-wrap">
                    <span>{selectedAlert.title}</span>
                  </DialogTitle>
                  <div className="flex items-center gap-2 mt-1">
                    <AlertPriorityBadge priority={selectedAlert.priority} />
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                      ID: {selectedAlert.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Operator</span>
                  <span className="font-semibold text-foreground">{selectedAlert.operator || 'Administrator'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Broadcast Time</span>
                  <span className="font-semibold text-foreground">{formatDate(selectedAlert.created_at)}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Channel</span>
                  <span className="font-semibold text-emerald-500 flex items-center gap-1">
                    <Smartphone className="w-3 h-3" />
                    Mobile App
                  </span>
                </div>
                {selectedAlert.emergency_type && (
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Emergency Type</span>
                    <span className="font-semibold text-foreground">{selectedAlert.emergency_type}</span>
                  </div>
                )}
                {selectedAlert.language && (
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Language</span>
                    <span className="font-semibold text-foreground">{selectedAlert.language}</span>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-primary" />
                  Full Broadcast Message
                </p>
                <div className="p-4 rounded-xl bg-card border border-border text-sm text-foreground leading-relaxed shadow-inner">
                  {selectedAlert.message}
                </div>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setSelectedAlert(null)}>Close</Button>
              <Button
                onClick={() => {
                  const aid = selectedAlert.id
                  setSelectedAlert(null)
                  navigate('/logs', { state: { tab: 'broadcast', highlightId: aid } })
                }}
                className="gap-2"
              >
                <span>View in Communication Logs →</span>
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ── Printable Official Analytics & Historical Report Modal ────────────── */}
      <PrintReportModal
        open={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        priorityData={priorityData}
        typeData={typeData}
        monthAlertsCount={monthCount}
        todayAlertsCount={todayCount}
        totalAlertsCount={totalAlertsCount}
        allIncidentsCount={allIncidentsCount}
        resolvedCount={resolvedCount}
        incidentTypeFilter={incidentTypeFilter}
        timeFilter={timeFilter}
        adminEmail={adminEmail}
      />

    </div>
  )
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, color, trend, onClick,
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
    accent:  'bg-accent/10 text-accent',
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
    danger:  'bg-destructive/10 text-destructive',
    muted:   'bg-muted text-muted-foreground',
  }
  return (
    <div onClick={onClick} className={`stat-card ${onClick ? 'cursor-pointer hover:border-primary/40 transition-colors' : ''}`}>
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
  label, icon, status,
}: {
  label: string
  icon: React.ReactNode
  status: 'online' | 'offline' | 'warning'
}) {
  const statusLabel = { online: 'Operational', offline: 'Offline', warning: 'Not Configured' }
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
