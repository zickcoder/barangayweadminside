import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Download, Search, Filter, Radio, Send,
  X, MapPin, Clock, Tag, Building2, User,
  Megaphone, FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { SkeletonTable } from '@/components/ui/skeleton'
import { StatusBadge, PriorityBadge, AlertPriorityBadge } from '@/components/shared/StatusBadge'
import { useBroadcastLogs, useReceivedCommunications } from '@/hooks/useBroadcastLogs'
import { formatDate, incidentTypeLabel, incidentTypeColor, downloadCSV } from '@/lib/utils'
import { detectAndTranslateIncident, isGeminiConfigured } from '@/services/aiService'
import type { DetectionAndTranslation } from '@/services/aiService'
import type { IncomingIncident, BroadcastLog } from '@/types'

type ActiveTab = 'received' | 'broadcast'

export default function CommunicationLogs() {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<ActiveTab>('received')
  const [search, setSearch] = useState('')
  const [filterDate, setFilterDate] = useState<string>('ALL')
  const [filterType, setFilterType] = useState<string>('ALL')

  // Detail dialog state
  const [viewedIncident, setViewedIncident] = useState<IncomingIncident | null>(null)
  const [viewedBroadcast, setViewedBroadcast] = useState<BroadcastLog | null>(null)

  // Translation states
  const [translationResult, setTranslationResult] = useState<DetectionAndTranslation | null>(null)
  const [translating, setTranslating] = useState(false)
  const [translationError, setTranslationError] = useState('')

  useEffect(() => {
    if (viewedIncident) {
      setTranslationResult(null)
      setTranslationError('')

      // Skip translating if description is blank or missing
      if (!viewedIncident.description?.trim()) {
        return
      }

      if (!isGeminiConfigured()) {
        setTranslationError('Gemini API key is not configured. Add VITE_GEMINI_API_KEY to your .env file to enable translation.')
        return
      }

      const performTranslation = async () => {
        setTranslating(true)
        try {
          const res = await detectAndTranslateIncident(viewedIncident.description)
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
  }, [viewedIncident?.id])

  useEffect(() => {
    if (location.state) {
      if (location.state.tab) setActiveTab(location.state.tab as ActiveTab)
      if (location.state.filterType) setFilterType(location.state.filterType as string)
      if (location.state.filterDate) setFilterDate(location.state.filterDate as string)
    }
  }, [location.state])

  const { data: broadcastLogs = [], isLoading: logsLoading } = useBroadcastLogs()
  const { data: receivedComms = [], isLoading: receivedLoading } = useReceivedCommunications()

  const filterByDate = (dateStr: string, filter: string) => {
    const itemDate = new Date(dateStr)
    const now = new Date()
    
    if (filter === 'TODAY') {
      return itemDate.toDateString() === now.toDateString()
    }
    
    if (filter === 'WEEK') {
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      return itemDate >= startOfWeek
    }
    
    if (filter === 'MONTH') {
      return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear()
    }
    
    if (filter === 'YEAR') {
      return itemDate.getFullYear() === now.getFullYear()
    }
    
    return true
  }

  const filteredReceived = receivedComms
    .filter(inc => {
      const matchSearch =
        !search ||
        inc.incident_id.toLowerCase().includes(search.toLowerCase()) ||
        inc.source_subsystem.toLowerCase().includes(search.toLowerCase()) ||
        inc.location.toLowerCase().includes(search.toLowerCase())
      const matchType = filterType === 'ALL' || inc.incident_type === filterType
      const matchDate = filterDate === 'ALL' || filterByDate(inc.created_at, filterDate)
      return matchSearch && matchType && matchDate
    })
    .sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      return -diff
    })

  const filteredBroadcasts = broadcastLogs
    .filter(log => {
      const matchSearch =
        !search ||
        log.title.toLowerCase().includes(search.toLowerCase()) ||
        (log.incident_id ?? '').toLowerCase().includes(search.toLowerCase()) ||
        log.operator.toLowerCase().includes(search.toLowerCase())
      const matchType = filterType === 'ALL' || log.emergency_type === filterType
      const matchDate = filterDate === 'ALL' || filterByDate(log.broadcast_time, filterDate)
      return matchSearch && matchType && matchDate
    })
    .sort((a, b) => {
      const diff = new Date(a.broadcast_time).getTime() - new Date(b.broadcast_time).getTime()
      return -diff
    })

  const handleExportReceived = () => {
    downloadCSV(
      filteredReceived.map(r => ({
        incident_id: r.incident_id,
        source: r.source_subsystem,
        type: r.incident_type,
        priority: r.priority,
        location: r.location,
        received_time: formatDate(r.created_at),
      })),
      'received_communications.csv'
    )
  }

  const handleExportBroadcasts = () => {
    downloadCSV(
      filteredBroadcasts.map(b => ({
        broadcast_id: b.id,
        incident_id: b.incident_id ?? '',
        title: b.title,
        operator: b.operator,
        broadcast_time: formatDate(b.broadcast_time),
      })),
      'broadcast_history.csv'
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="page-title">Communication Logs</h2>
        <p className="page-subtitle">
          Complete history of all received incidents and broadcast alerts. Click any row to view full details.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-full sm:w-fit overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab('received')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 flex-1 sm:flex-initial justify-center ${
            activeTab === 'received'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Radio className="w-4 h-4 flex-shrink-0" />
          <span>Received Communications</span>
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-muted-foreground/20">
            {receivedComms.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('broadcast')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 flex-1 sm:flex-initial justify-center ${
            activeTab === 'broadcast'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Send className="w-4 h-4 flex-shrink-0" />
          <span>Broadcast History</span>
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-muted-foreground/20">
            {broadcastLogs.length}
          </span>
        </button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterType} onChange={e => setFilterType(e.target.value)} className="sm:w-44">
              <option value="ALL">All Types</option>
              {['FIRE', 'FLOOD', 'CRIME', 'MEDICAL', 'EARTHQUAKE', 'OTHER'].map(t => (
                <option key={t} value={t}>{incidentTypeLabel(t)}</option>
              ))}
            </Select>
            <Select value={filterDate} onChange={e => setFilterDate(e.target.value)} className="sm:w-40">
              <option value="ALL">All Time</option>
              <option value="TODAY">Today</option>
              <option value="WEEK">This Week</option>
              <option value="MONTH">This Month</option>
              <option value="YEAR">This Year</option>
            </Select>
            <Button
              variant="outline"
              size="default"
              onClick={activeTab === 'received' ? handleExportReceived : handleExportBroadcasts}
              className="gap-2 w-full sm:w-auto"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Received Communications Table / Cards ── */}
      {activeTab === 'received' && (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold">
              Received Communications
              <span className="ml-2 text-muted-foreground font-normal">({filteredReceived.length} records)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {receivedLoading ? (
              <div className="p-6"><SkeletonTable rows={6} /></div>
            ) : filteredReceived.length === 0 ? (
              <EmptyState message="No received communications found" />
            ) : (
              <>
                {/* Mobile View: Cards Stack (< md) */}
                <div className="block md:hidden divide-y divide-border">
                  {filteredReceived.map(inc => (
                    <div
                      key={inc.id}
                      onClick={() => setViewedIncident(inc)}
                      className="p-4 hover:bg-muted/40 transition-colors cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-primary font-bold">{inc.incident_id}</span>
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
                        <span className="text-muted-foreground text-[10px] whitespace-nowrap">{formatDate(inc.created_at)}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-muted-foreground">{inc.source_subsystem}</span>
                        <span className="text-xs text-primary font-medium">View Details →</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View: Table (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {['Incident ID', 'Type', 'Priority', 'Location', 'Received Time', ''].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredReceived.map(inc => (
                        <tr
                          key={inc.id}
                          onClick={() => setViewedIncident(inc)}
                          className="border-b border-border last:border-0 table-row-hover transition-colors cursor-pointer group"
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-primary font-semibold">{inc.incident_id}</span>
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
                          <td className="px-4 py-3"><PriorityBadge priority={inc.priority} /></td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-foreground max-w-[140px] truncate block">{inc.location}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(inc.created_at)}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                              View Details →
                            </span>
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
      )}

      {/* ── Broadcast History Table / Cards ── */}
      {activeTab === 'broadcast' && (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-semibold">
              Broadcast History
              <span className="ml-2 text-muted-foreground font-normal">({filteredBroadcasts.length} records)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="p-6"><SkeletonTable rows={6} /></div>
            ) : filteredBroadcasts.length === 0 ? (
              <EmptyState message="No broadcast history found" />
            ) : (
              <>
                {/* Mobile View: Cards Stack (< md) */}
                <div className="block md:hidden divide-y divide-border">
                  {filteredBroadcasts.map(log => (
                    <div
                      key={log.id}
                      onClick={() => setViewedBroadcast(log)}
                      className="p-4 hover:bg-muted/40 transition-colors cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-primary font-semibold">{log.incident_id ?? '—'}</span>
                        <AlertPriorityBadge priority={log.priority} />
                      </div>

                      <div>
                        <p className="text-xs font-bold text-foreground truncate">{log.title}</p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{log.message}</p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                        <span>👤 {log.operator} · {formatDate(log.broadcast_time)}</span>
                        <span className="text-xs text-primary font-medium">View Details →</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop View: Table (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {['Incident ID', 'Title', 'Priority', 'Operator', 'Broadcast Time', ''].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBroadcasts.map(log => (
                        <tr
                          key={log.id}
                          onClick={() => setViewedBroadcast(log)}
                          className="border-b border-border last:border-0 table-row-hover transition-colors cursor-pointer group"
                        >
                          <td className="px-4 py-3">
                            <span className="font-mono text-xs text-primary">{log.incident_id ?? '—'}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-foreground font-medium max-w-[220px] truncate block" title={log.title}>
                              {log.title}
                            </span>
                          </td>
                          <td className="px-4 py-3"><AlertPriorityBadge priority={log.priority} /></td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground">{log.operator}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(log.broadcast_time)}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                              View Details →
                            </span>
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
      )}

      {/* ── Received Incident Detail Dialog ── */}
      <Dialog open={!!viewedIncident} onOpenChange={(open) => !open && setViewedIncident(null)}>
        {viewedIncident && (
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: incidentTypeColor(viewedIncident.incident_type) }}
                >
                  {viewedIncident.incident_type.charAt(0)}
                </div>
                <div>
                  <DialogTitle>Received Communication Detail</DialogTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{viewedIncident.incident_id}</p>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <StatusBadge status={viewedIncident.status} />
                <PriorityBadge priority={viewedIncident.priority} />
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{
                    background: `${incidentTypeColor(viewedIncident.incident_type)}18`,
                    color: incidentTypeColor(viewedIncident.incident_type),
                  }}
                >
                  {incidentTypeLabel(viewedIncident.incident_type)}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LogDetailRow icon={<Building2 className="w-3.5 h-3.5" />} label="Source" value={viewedIncident.source_subsystem} />
                <LogDetailRow icon={<User className="w-3.5 h-3.5" />} label="Reported By" value={viewedIncident.reported_by ?? 'Unknown'} />
                <LogDetailRow icon={<MapPin className="w-3.5 h-3.5" />} label="Location" value={viewedIncident.location} />
                <LogDetailRow icon={<Clock className="w-3.5 h-3.5" />} label="Date Reported" value={formatDate(viewedIncident.date_reported)} />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Incident Description
                </p>
                <div className="space-y-3">
                  {/* Original Report */}
                  <div className="p-3 bg-muted/40 rounded-lg text-sm text-foreground leading-relaxed border border-border">
                    {viewedIncident.description ? (
                      <p>{viewedIncident.description}</p>
                    ) : (
                      <p className="text-muted-foreground italic text-xs">No description available.</p>
                    )}
                  </div>

                  {/* Translation Block (Only shown if description exists) */}
                  {viewedIncident.description?.trim() && (
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 flex flex-col justify-between">
                      <div>
                        {translating ? (
                          <div className="space-y-1.5 py-1.5">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">Detecting & Translating...</span>
                            <div className="h-2 bg-muted rounded animate-pulse w-full" />
                            <div className="h-2 bg-muted rounded animate-pulse w-5/6" />
                          </div>
                        ) : translationError ? (
                          <div>
                            <span className="text-[10px] font-bold text-destructive uppercase tracking-wider block mb-1">Translation Failed</span>
                            <p className="text-xs text-muted-foreground italic">{translationError}</p>
                          </div>
                        ) : translationResult ? (
                          <div>
                            <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-1">
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
                    </div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewedIncident(null)}>
                <X className="w-4 h-4 mr-1.5" /> Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ── Broadcast Detail Dialog ── */}
      <Dialog open={!!viewedBroadcast} onOpenChange={(open) => !open && setViewedBroadcast(null)}>
        {viewedBroadcast && (
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Megaphone className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <DialogTitle>Broadcast Detail</DialogTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{viewedBroadcast.id.slice(0, 16)}...</p>
                </div>
              </div>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <AlertPriorityBadge priority={viewedBroadcast.priority} />
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                  {viewedBroadcast.emergency_type}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LogDetailRow icon={<Tag className="w-3.5 h-3.5" />} label="Incident ID" value={viewedBroadcast.incident_id ?? '—'} />
                <LogDetailRow icon={<User className="w-3.5 h-3.5" />} label="Operator" value={viewedBroadcast.operator} />
                <LogDetailRow icon={<Clock className="w-3.5 h-3.5" />} label="Broadcast Time" value={formatDate(viewedBroadcast.broadcast_time)} />
                <LogDetailRow icon={<Megaphone className="w-3.5 h-3.5" />} label="Channel" value={viewedBroadcast.channel} />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">Alert Title</p>
                <p className="text-sm font-bold text-foreground">{viewedBroadcast.title}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Full Alert Message
                </p>
                <div className="p-3 bg-muted/50 rounded-lg text-sm text-foreground leading-relaxed border border-border">
                  {viewedBroadcast.message}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewedBroadcast(null)}>
                <X className="w-4 h-4 mr-1.5" /> Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="p-16 text-center">
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}

function LogDetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        {icon}{label}
      </div>
      <p className="text-xs text-foreground font-medium">{value}</p>
    </div>
  )
}
