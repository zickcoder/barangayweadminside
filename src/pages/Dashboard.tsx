import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Megaphone, AlertTriangle, CheckCircle2,
  Activity, TrendingUp, ArrowUpRight, Wifi, Bot, Server,
  Smartphone, Building2, XCircle, FileText, Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { SkeletonCard } from '@/components/ui/skeleton'
import { StatusBadge, PriorityBadge, AlertPriorityBadge } from '@/components/shared/StatusBadge'
import { useAlerts, useAlertStats } from '@/hooks/useAlerts'
import { useIncidents, usePendingIncidentsCount, useUpdateIncidentStatus } from '@/hooks/useIncidents'
import { detectAndTranslateIncident, isGeminiConfigured } from '@/services/aiService'
import type { DetectionAndTranslation } from '@/services/aiService'
import { getGreeting, formatDateShort, formatDate, incidentTypeColor, incidentTypeLabel } from '@/lib/utils'
import type { Alert, IncomingIncident, IncidentStatus } from '@/types'

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts()
  const { data: incidents = [], isLoading: incidentsLoading } = useIncidents()
  const { data: stats, isLoading: statsLoading } = useAlertStats('month')
  const { data: pendingCount = 0 } = usePendingIncidentsCount()
  const updateStatus = useUpdateIncidentStatus()

  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)
  const [selectedReceivedIncident, setSelectedReceivedIncident] = useState<IncomingIncident | null>(null)
  const [disregardTarget, setDisregardTarget] = useState<IncomingIncident | null>(null)
  const [disregarding, setDisregarding] = useState(false)

  // AI Translation state for dashboard modal
  const [translationResult, setTranslationResult] = useState<DetectionAndTranslation | null>(null)
  const [translating, setTranslating] = useState(false)
  const [translationError, setTranslationError] = useState('')

  useEffect(() => {
    if (selectedReceivedIncident) {
      setTranslationResult(null)
      setTranslationError('')

      if (!selectedReceivedIncident.description?.trim()) return

      if (!isGeminiConfigured()) {
        setTranslationError('Gemini API key is not configured.')
        return
      }

      const performTranslation = async () => {
        setTranslating(true)
        try {
          const res = await detectAndTranslateIncident(selectedReceivedIncident.description)
          setTranslationResult(res)
        } catch (err) {
          console.error(err)
          setTranslationError('Failed to translate incident description.')
        } finally {
          setTranslating(false)
        }
      }

      performTranslation()
    } else {
      setTranslationResult(null)
      setTranslating(false)
    }
  }, [selectedReceivedIncident?.id])

  const handleDisregardConfirm = async () => {
    if (!disregardTarget) return
    setDisregarding(true)
    try {
      await updateStatus.mutateAsync({ id: disregardTarget.id, status: 'Disregarded' as IncidentStatus })
      setDisregardTarget(null)
    } finally {
      setDisregarding(false)
    }
  }

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

      {/* Latest Emergency Alert Card */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold font-display uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-primary" />
            Latest Emergency Alert
          </h3>
          {latestAlert && (
            <button
              onClick={() => navigate('/logs', { state: { tab: 'broadcast' } })}
              className="text-xs text-primary hover:underline font-medium cursor-pointer"
            >
              View Communication Logs →
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
                  Active Broadcast
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

      {/* Alert Detail Popout Dialog */}
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
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Channels</span>
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
              <Button variant="outline" onClick={() => setSelectedAlert(null)}>
                Close
              </Button>
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

      {/* Received Communications Incidents Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-semibold font-display text-foreground">Received Communications Incidents</h3>
          <button
            onClick={() => navigate('/logs', { state: { tab: 'received' } })}
            className="text-xs text-primary hover:underline font-medium"
          >
            View Communication Logs →
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
                      onClick={() => setSelectedReceivedIncident(inc)}
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
                            {incidentTypeLabel(inc.incident_type)}
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
                          onClick={() => setSelectedReceivedIncident(inc)}
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
                              {incidentTypeLabel(inc.incident_type)}
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

      {/* Received Incident Detail Dialog přímo na Dashboard screen UI */}
      <Dialog open={!!selectedReceivedIncident} onOpenChange={(open) => !open && setSelectedReceivedIncident(null)}>
        {selectedReceivedIncident && (
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm"
                  style={{ background: incidentTypeColor(selectedReceivedIncident.incident_type) }}
                >
                  {selectedReceivedIncident.incident_type.charAt(0)}
                </div>
                <div>
                  <DialogTitle className="text-base font-bold font-display flex items-center gap-2">
                    <span>Received Communication Detail</span>
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{selectedReceivedIncident.incident_id}</p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="flex gap-2 flex-wrap">
                <StatusBadge status={selectedReceivedIncident.status} />
                <PriorityBadge priority={selectedReceivedIncident.priority} />
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{
                    background: `${incidentTypeColor(selectedReceivedIncident.incident_type)}18`,
                    color: incidentTypeColor(selectedReceivedIncident.incident_type),
                  }}
                >
                  {incidentTypeLabel(selectedReceivedIncident.incident_type)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-muted/40 border border-border text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Source Subsystem</span>
                  <span className="font-semibold text-foreground">{selectedReceivedIncident.source_subsystem}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Reported By</span>
                  <span className="font-semibold text-foreground">{selectedReceivedIncident.reported_by ?? 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Location</span>
                  <span className="font-semibold text-foreground">{selectedReceivedIncident.location}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Received Time</span>
                  <span className="font-semibold text-foreground">{formatDate(selectedReceivedIncident.created_at)}</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  Incident Description
                </p>
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-card border border-border text-sm text-foreground leading-relaxed shadow-inner">
                    {selectedReceivedIncident.description ? (
                      <p>{selectedReceivedIncident.description}</p>
                    ) : (
                      <p className="text-muted-foreground italic text-xs">No description available.</p>
                    )}
                  </div>

                  {/* AI Translation Block */}
                  {selectedReceivedIncident.description?.trim() && (
                    <div className="p-3 bg-primary/5 rounded-xl border border-primary/15">
                      {translating ? (
                        <div className="space-y-1.5 py-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Detecting & Translating...</span>
                          <div className="h-2 bg-muted rounded animate-pulse w-full" />
                          <div className="h-2 bg-muted rounded animate-pulse w-4/5" />
                        </div>
                      ) : translationError ? (
                        <div>
                          <span className="text-[10px] font-bold text-destructive uppercase tracking-wider block">Translation Failed</span>
                          <p className="text-xs text-muted-foreground italic mt-0.5">{translationError}</p>
                        </div>
                      ) : translationResult ? (
                        <div>
                          <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">
                            {translationResult.detected_language === 'English'
                              ? '[Translated to Tagalog]'
                              : '[Translated to English]'}
                          </span>
                          <p className="text-xs text-foreground leading-relaxed mt-1 whitespace-pre-line">
                            {translationResult.translated_text}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="flex-row items-center justify-between gap-2">
              <Button variant="outline" onClick={() => setSelectedReceivedIncident(null)}>
                Close
              </Button>
              <div className="flex items-center gap-2">
                {selectedReceivedIncident.status !== 'Broadcasted' && selectedReceivedIncident.status !== 'Disregarded' ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const inc = selectedReceivedIncident
                        setSelectedReceivedIncident(null)
                        setDisregardTarget(inc)
                      }}
                      className="gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Disregard
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        const inc = selectedReceivedIncident
                        setSelectedReceivedIncident(null)
                        navigate('/broadcast', { state: { incident: inc } })
                      }}
                      className="gap-1.5 text-xs font-bold"
                    >
                      <Megaphone className="w-3.5 h-3.5" />
                      Broadcast Incident
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 px-3 py-1 bg-muted rounded-lg border border-border">
                    Status: <StatusBadge status={selectedReceivedIncident.status} />
                  </span>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Disregard Confirm Dialog */}
      <Dialog open={!!disregardTarget} onOpenChange={(open) => !open && setDisregardTarget(null)}>
        {disregardTarget && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <DialogTitle>Disregard Incident?</DialogTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{disregardTarget.incident_id}</p>
                </div>
              </div>
            </DialogHeader>
            <div className="py-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                This incident will be marked as <span className="font-semibold text-foreground">Disregarded</span>.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDisregardTarget(null)} disabled={disregarding}>Cancel</Button>
              <Button variant="destructive" onClick={handleDisregardConfirm} disabled={disregarding} className="gap-2">
                {disregarding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                Disregard
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

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
              label="Database Connected"
              icon={<Wifi className="w-4 h-4" />}
              status="online"
            />
            <SystemStatusRow
              label="AI Status"
              icon={<Bot className="w-4 h-4" />}
              status="online"
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
