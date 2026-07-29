import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Eye, ArrowRight, RefreshCw, Filter,
  MapPin, Clock, Tag, Building2, FlaskConical,
  Bot, Loader2, Wand2, Send, Check, Megaphone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { SkeletonTable } from '@/components/ui/skeleton'
import { StatusBadge, PriorityBadge } from '@/components/shared/StatusBadge'
import { useIncidents, useUpdateIncidentStatus } from '@/hooks/useIncidents'
import { seedDemoIncident } from '@/services/incidentApi'
import { generateEnglishAlert, isGeminiConfigured } from '@/services/aiService'
import { formatDate, incidentTypeLabel, incidentTypeColor } from '@/lib/utils'
import type { IncomingIncident, IncidentStatus } from '@/types'

export default function IncomingCommunications() {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: incidents = [], isLoading, refetch } = useIncidents()
  const updateStatus = useUpdateIncidentStatus()

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('ALL')
  const [selectedIncident, setSelectedIncident] = useState<IncomingIncident | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})

  // AI state inside the detail dialog
  const [aiMessage, setAiMessage] = useState('')
  const [generatingAi, setGeneratingAi] = useState(false)
  const [aiError, setAiError] = useState('')

  // Listen to navigation state
  useEffect(() => {
    if (location.state?.highlightId && incidents.length > 0) {
      const hid = location.state.highlightId as string
      setHighlightId(hid)
      const found = incidents.find(i => i.id === hid)
      if (found) {
        handleView(found)
      }
      setTimeout(() => {
        rowRefs.current[hid]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
      setTimeout(() => setHighlightId(null), 3000)
    }
  }, [location.state, incidents])

  // Reset AI state when dialog opens for a new incident
  useEffect(() => {
    if (selectedIncident) {
      setAiMessage('')
      setAiError('')
    }
  }, [selectedIncident?.id])

  // Hide Broadcasted incidents from the queue
  const filtered = incidents.filter(inc => {
    if (inc.status === 'Broadcasted') return false
    const matchSearch =
      !search ||
      inc.incident_id.toLowerCase().includes(search.toLowerCase()) ||
      inc.location.toLowerCase().includes(search.toLowerCase()) ||
      inc.source_subsystem.toLowerCase().includes(search.toLowerCase()) ||
      inc.description.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'ALL' || inc.incident_type === filterType
    return matchSearch && matchType
  })

  const handleSeedDemo = async () => {
    setSeeding(true)
    try {
      await seedDemoIncident()
      await refetch()
    } finally {
      setSeeding(false)
    }
  }

  // View: mark as Seen if Pending, open dialog
  const handleView = (inc: IncomingIncident) => {
    if (inc.status === 'Pending') {
      updateStatus.mutate({ id: inc.id, status: 'Seen' })
      setSelectedIncident({ ...inc, status: 'Seen' })
    } else {
      setSelectedIncident(inc)
    }
  }

  const handleGenerateAI = async (incident: IncomingIncident) => {
    if (!isGeminiConfigured()) {
      setAiError('Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.')
      return
    }
    if (!incident.description?.trim()) {
      setAiError('No incident description found. Cannot summarize an empty report.')
      return
    }
    setAiError('')
    setGeneratingAi(true)
    try {
      const text = await generateEnglishAlert({
        incidentType: incident.incident_type,
        priority: incident.priority,
        location: incident.location,
        description: incident.description.trim(),  // always the raw incident description, trimmed
      })
      setAiMessage(text)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate alert')
    } finally {
      setGeneratingAi(false)
    }
  }

  const handleDefaultBroadcast = (incident: IncomingIncident) => {
    setSelectedIncident(null)
    navigate('/broadcast', { state: { incident } })
  }

  const handleAiBroadcast = (incident: IncomingIncident) => {
    setSelectedIncident(null)
    navigate('/broadcast', {
      state: {
        incident,
        prefilledMessage: aiMessage,
        isAiPreFilled: true,
      },
    })
  }

  const pendingCount = incidents.filter(i => i.status === 'Pending').length
  const seenCount = incidents.filter(i => i.status === 'Seen').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="page-title">Incoming Communications</h2>
          <p className="page-subtitle">
            <span className="text-destructive font-medium">{pendingCount} pending</span>
            {' · '}
            <span className="text-muted-foreground">{seenCount} viewed</span>
            {' · '}
            {incidents.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSeedDemo}
            disabled={seeding}
            className="gap-2"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            {seeding ? 'Seeding...' : 'Seed Demo Data'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, location, source..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="sm:w-40"
            >
              <option value="ALL">All Types</option>
              {['FIRE', 'FLOOD', 'CRIME', 'MEDICAL', 'EARTHQUAKE', 'OTHER'].map(t => (
                <option key={t} value={t}>{incidentTypeLabel(t)}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table & Cards */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-semibold">Incident Queue</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><SkeletonTable rows={5} /></div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center">
              <RadioSvg className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No incidents found</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {incidents.length === 0
                  ? 'Click "Seed Demo Data" to add test incidents.'
                  : 'Try adjusting your search.'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile View: Cards Stack (< md) */}
              <div className="block md:hidden divide-y divide-border">
                {filtered.map(inc => (
                  <div
                    key={inc.id}
                    className={`p-4 transition-all duration-300 space-y-3 ${
                      highlightId === inc.id
                        ? 'bg-primary/10 ring-2 ring-primary/40 ring-inset'
                        : inc.status === 'Pending'
                        ? 'bg-destructive/3'
                        : ''
                    }`}
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

                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-foreground">{inc.location}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{inc.description}</p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                      <span>{inc.source_subsystem} · {formatDate(inc.created_at)}</span>
                      <StatusBadge status={inc.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(inc)}
                        className="w-full gap-1.5 text-xs h-8"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => navigate('/broadcast', { state: { incident: inc } })}
                        className="w-full gap-1.5 text-xs h-8"
                      >
                        <Megaphone className="w-3.5 h-3.5" />
                        Broadcast
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View: Table (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Incident ID', 'Source', 'Type', 'Priority', 'Location', 'Received', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(inc => (
                      <tr
                        key={inc.id}
                        ref={el => { rowRefs.current[inc.id] = el }}
                        className={`border-b border-border last:border-0 transition-all duration-300 ${
                          highlightId === inc.id
                            ? 'bg-primary/10 ring-2 ring-primary/40 ring-inset'
                            : inc.status === 'Pending'
                            ? 'bg-destructive/3 hover:bg-destructive/6'
                            : 'table-row-hover'
                        }`}
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
                          <span className="text-xs text-foreground max-w-[140px] truncate block" title={inc.location}>
                            {inc.location}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(inc.created_at)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={inc.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(inc)}
                              className="gap-1.5 text-xs h-7 px-2.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => navigate('/broadcast', { state: { incident: inc } })}
                              className="gap-1.5 text-xs h-7 px-2.5"
                            >
                              <Megaphone className="w-3.5 h-3.5" />
                              Broadcast Alert
                            </Button>
                          </div>
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

      {/* Detail Dialog */}
      <Dialog open={!!selectedIncident} onOpenChange={(open) => !open && setSelectedIncident(null)}>
        {selectedIncident && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: incidentTypeColor(selectedIncident.incident_type) }}
                >
                  {selectedIncident.incident_type.charAt(0)}
                </div>
                <div>
                  <DialogTitle>Incident Details</DialogTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{selectedIncident.incident_id}</p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {/* Badges */}
              <div className="flex gap-2 flex-wrap">
                <StatusBadge status={selectedIncident.status} />
                <PriorityBadge priority={selectedIncident.priority} />
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{
                    background: `${incidentTypeColor(selectedIncident.incident_type)}18`,
                    color: incidentTypeColor(selectedIncident.incident_type),
                  }}
                >
                  {incidentTypeLabel(selectedIncident.incident_type)}
                </span>
              </div>

              {/* Detail Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailRow icon={<Building2 className="w-3.5 h-3.5" />} label="Source" value={selectedIncident.source_subsystem} />
                <DetailRow icon={<Tag className="w-3.5 h-3.5" />} label="Reported By" value={selectedIncident.reported_by ?? 'Unknown'} />
                <DetailRow icon={<MapPin className="w-3.5 h-3.5" />} label="Location" value={selectedIncident.location} />
                <DetailRow icon={<Clock className="w-3.5 h-3.5" />} label="Date Reported" value={formatDate(selectedIncident.date_reported)} />
              </div>

              {/* Incident Description — this is what AI will summarize */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3 h-3" />
                  Incident Description
                </p>
                <div className="p-3 bg-muted/50 rounded-lg text-sm text-foreground leading-relaxed border border-border">
                  {selectedIncident.description}
                </div>
              </div>
              </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedIncident(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

function RadioSvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304-.001a3.75 3.75 0 010 5.304m-7.425 2.122a6.75 6.75 0 010-9.546m9.546.001a6.75 6.75 0 010 9.545M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12h.75v.75H12V12z" />
    </svg>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <p className="text-xs text-foreground font-medium">{value}</p>
    </div>
  )
}
