import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Eye, RefreshCw, Filter,
  MapPin, Clock, Tag, Building2, FlaskConical,
  Bot, Loader2, Megaphone, Languages,
  XCircle, Trash2, CheckSquare, Square, ArrowRight, Sparkles,
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
import { generateEnglishAlert, generateTagalogAlert, isGeminiConfigured } from '@/services/aiService'
import { formatDate, incidentTypeLabel, incidentTypeColor } from '@/lib/utils'
import type { IncomingIncident, IncidentStatus } from '@/types'

// ─── Taglish detection helper ──────────────────────────────────────────────────
function detectLanguage(text: string): 'English' | 'Tagalog' | 'Taglish' {
  if (!text) return 'English'
  const tagalogWords = /\b(ng|mga|ang|sa|nang|para|po|ako|ikaw|siya|kami|kayo|sila|nasunog|baha|sunog|sakolo|naaksidente|tulong|tumakas|dumating|naabisuhan|lugar|bahay|gusali|kalsada|pulis|bumbero|doktor|ospital|may|hindi|oo|ano|nasaan|kahapon|ngayon|bukas|namatay|nasugatan|nasalanta|init|ulan|bagyo|lindol|banta|peligro)\b/i
  const englishWords = /\b(fire|flood|crime|medical|earthquake|emergency|incident|report|help|please|immediately|residents|vicinity|danger|warning|alert|police|ambulance|hospital|injured|dead|evacuate|stay|inside|outside|building|road|area|house)\b/i
  const hasTagalog = tagalogWords.test(text)
  const hasEnglish = englishWords.test(text)
  if (hasTagalog && hasEnglish) return 'Taglish'
  if (hasTagalog) return 'Tagalog'
  return 'English'
}

type BroadcastModalLang = 'English' | 'Tagalog' | null

export default function IncomingCommunications() {
  const navigate = useNavigate()
  const location = useLocation()
  const { data: incidents = [], isLoading, refetch } = useIncidents()
  const updateStatus = useUpdateIncidentStatus()

  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('ALL')

  // View-only dialog
  const [viewIncident, setViewIncident] = useState<IncomingIncident | null>(null)

  // Broadcast dialog (separate from view)
  const [broadcastIncident, setBroadcastIncident] = useState<IncomingIncident | null>(null)
  const [broadcastLang, setBroadcastLang] = useState<BroadcastModalLang>(null)
  const [broadcastAiMessage, setBroadcastAiMessage] = useState('')
  const [broadcastGenerating, setBroadcastGenerating] = useState(false)
  const [broadcastAiError, setBroadcastAiError] = useState('')

  const [seeding, setSeeding] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})

  // Select All / Bulk Disregard state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)

  // Single disregard confirm state
  const [disregardTarget, setDisregardTarget] = useState<IncomingIncident | null>(null)
  const [bulkDisregardOpen, setBulkDisregardOpen] = useState(false)
  const [disregarding, setDisregarding] = useState(false)

  // Listen to navigation state
  useEffect(() => {
    if (location.state?.highlightId && incidents.length > 0) {
      const hid = location.state.highlightId as string
      setHighlightId(hid)
      const found = incidents.find(i => i.id === hid)
      if (found) handleView(found)
      setTimeout(() => {
        rowRefs.current[hid]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
      setTimeout(() => setHighlightId(null), 3000)
    }
  }, [location.state, incidents])

  // Reset broadcast AI state when broadcast dialog changes incident
  useEffect(() => {
    if (broadcastIncident) {
      setBroadcastAiMessage('')
      setBroadcastAiError('')
      setBroadcastLang(null)
    }
  }, [broadcastIncident?.id])

  // Hide Broadcasted and Disregarded incidents from the queue
  const filtered = incidents.filter(inc => {
    if (inc.status === 'Broadcasted' || inc.status === 'Disregarded') return false
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

  // View-only: mark as Seen if Pending, open VIEW dialog only
  const handleView = (inc: IncomingIncident) => {
    if (inc.status === 'Pending') {
      updateStatus.mutate({ id: inc.id, status: 'Seen' })
      setViewIncident({ ...inc, status: 'Seen' })
    } else {
      setViewIncident(inc)
    }
  }

  // Open Broadcast dialog (does NOT mark as seen — they haven't acted yet)
  const handleOpenBroadcast = (inc: IncomingIncident) => {
    setBroadcastIncident(inc)
  }

  // AI generate for broadcast modal
  const handleBroadcastGenerateAI = async (lang: 'English' | 'Tagalog') => {
    if (!broadcastIncident) return
    if (!isGeminiConfigured()) {
      setBroadcastAiError('Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.')
      return
    }
    if (!broadcastIncident.description?.trim()) {
      setBroadcastAiError('No incident description found. Cannot summarize an empty report.')
      return
    }
    setBroadcastAiError('')
    setBroadcastGenerating(true)
    setBroadcastLang(lang)
    setBroadcastAiMessage('')
    try {
      const ctx = {
        incidentType: broadcastIncident.incident_type,
        priority: broadcastIncident.priority,
        location: broadcastIncident.location,
        description: broadcastIncident.description.trim(),
      }
      const text = lang === 'English'
        ? await generateEnglishAlert(ctx)
        : await generateTagalogAlert(ctx)
      setBroadcastAiMessage(text)
    } catch (err) {
      setBroadcastAiError(err instanceof Error ? err.message : 'Failed to generate alert')
      setBroadcastLang(null)
    } finally {
      setBroadcastGenerating(false)
    }
  }

  // Proceed to broadcast page
  const handleProceedBroadcast = (useAi: boolean) => {
    if (!broadcastIncident) return
    setBroadcastIncident(null)
    navigate('/broadcast', {
      state: {
        incident: broadcastIncident,
        prefilledMessage: useAi && broadcastAiMessage ? broadcastAiMessage : broadcastIncident.description,
        isAiPreFilled: useAi && !!broadcastAiMessage,
      },
    })
  }

  // Disregard handlers
  const handleDisregardConfirm = async () => {
    if (!disregardTarget) return
    setDisregarding(true)
    try {
      await updateStatus.mutateAsync({ id: disregardTarget.id, status: 'Disregarded' as IncidentStatus })
      setDisregardTarget(null)
      await refetch()
    } finally {
      setDisregarding(false)
    }
  }

  const handleBulkDisregardConfirm = async () => {
    setDisregarding(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => updateStatus.mutateAsync({ id, status: 'Disregarded' as IncidentStatus }))
      )
      setSelectedIds(new Set())
      setSelectMode(false)
      setBulkDisregardOpen(false)
      await refetch()
    } finally {
      setDisregarding(false)
    }
  }

  const toggleSelectMode = () => {
    setSelectMode(!selectMode)
    setSelectedIds(new Set())
  }

  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(i => i.id)))
    }
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
        <div className="flex items-center gap-2 flex-wrap">
          {selectMode && selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setBulkDisregardOpen(true)}
              className="gap-2 animate-fade-in"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Disregard Selected ({selectedIds.size})
            </Button>
          )}
          <Button
            variant={selectMode ? 'secondary' : 'outline'}
            size="sm"
            onClick={toggleSelectMode}
            className="gap-2"
          >
            {selectMode ? <XCircle className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
            {selectMode ? 'Cancel Select' : 'Select All'}
          </Button>
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
                        onClick={() => handleOpenBroadcast(inc)}
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
                      {selectMode && (
                        <th className="px-4 py-3 w-10">
                          <button
                            onClick={toggleSelectAll}
                            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            {selectedIds.size === filtered.length && filtered.length > 0
                              ? <CheckSquare className="w-4 h-4 text-primary" />
                              : <Square className="w-4 h-4" />
                            }
                          </button>
                        </th>
                      )}
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
                          selectedIds.has(inc.id)
                            ? 'bg-destructive/5 ring-1 ring-destructive/20 ring-inset'
                            : highlightId === inc.id
                            ? 'bg-primary/10 ring-2 ring-primary/40 ring-inset'
                            : inc.status === 'Pending'
                            ? 'bg-destructive/3 hover:bg-destructive/6'
                            : 'table-row-hover'
                        }`}
                      >
                        {selectMode && (
                          <td className="px-4 py-3">
                            <button
                              onClick={() => toggleSelectId(inc.id)}
                              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                              {selectedIds.has(inc.id)
                                ? <CheckSquare className="w-4 h-4 text-destructive" />
                                : <Square className="w-4 h-4" />
                              }
                            </button>
                          </td>
                        )}
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
                            {/* VIEW ONLY - no actions inside */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleView(inc)}
                              className="gap-1.5 text-xs h-7 px-2.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </Button>
                            {/* BROADCAST - opens broadcast dialog */}
                            <Button
                              size="sm"
                              onClick={() => handleOpenBroadcast(inc)}
                              className="gap-1.5 text-xs h-7 px-2.5"
                            >
                              <Megaphone className="w-3.5 h-3.5" />
                              Broadcast
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDisregardTarget(inc)}
                              className="gap-1.5 text-xs h-7 px-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Disregard
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

      {/* ─── VIEW-ONLY Detail Dialog ─────────────────────────────────────────── */}
      <Dialog open={!!viewIncident} onOpenChange={(open) => !open && setViewIncident(null)}>
        {viewIncident && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: incidentTypeColor(viewIncident.incident_type) }}
                >
                  {viewIncident.incident_type.charAt(0)}
                </div>
                <div>
                  <DialogTitle>Incident Details</DialogTitle>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{viewIncident.incident_id}</p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {/* Badges */}
              <div className="flex gap-2 flex-wrap">
                <StatusBadge status={viewIncident.status} />
                <PriorityBadge priority={viewIncident.priority} />
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{
                    background: `${incidentTypeColor(viewIncident.incident_type)}18`,
                    color: incidentTypeColor(viewIncident.incident_type),
                  }}
                >
                  {incidentTypeLabel(viewIncident.incident_type)}
                </span>
              </div>

              {/* Detail Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailRow icon={<Building2 className="w-3.5 h-3.5" />} label="Source" value={viewIncident.source_subsystem} />
                <DetailRow icon={<Tag className="w-3.5 h-3.5" />} label="Reported By" value={viewIncident.reported_by ?? 'Unknown'} />
                <DetailRow icon={<MapPin className="w-3.5 h-3.5" />} label="Location" value={viewIncident.location} />
                <DetailRow icon={<Clock className="w-3.5 h-3.5" />} label="Date Reported" value={formatDate(viewIncident.date_reported)} />
              </div>

              {/* Description */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3 h-3" />
                  Incident Description
                </p>
                <div className="p-3 bg-muted/50 rounded-lg text-sm text-foreground leading-relaxed border border-border">
                  {viewIncident.description || <span className="text-muted-foreground italic">No description provided.</span>}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setViewIncident(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ─── BROADCAST Dialog with AI Summarization ──────────────────────────── */}
      <Dialog open={!!broadcastIncident} onOpenChange={(open) => !open && setBroadcastIncident(null)}>
        {broadcastIncident && (
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: incidentTypeColor(broadcastIncident.incident_type) }}
                >
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <DialogTitle className="flex items-center gap-2">
                    Broadcast Incident
                    <span className="text-xs font-normal text-muted-foreground font-mono">{broadcastIncident.incident_id}</span>
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Review details and choose how to summarize the alert message.</p>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              {/* Badges */}
              <div className="flex gap-2 flex-wrap items-center">
                <PriorityBadge priority={broadcastIncident.priority} />
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{
                    background: `${incidentTypeColor(broadcastIncident.incident_type)}18`,
                    color: incidentTypeColor(broadcastIncident.incident_type),
                  }}
                >
                  {incidentTypeLabel(broadcastIncident.incident_type)}
                </span>
                {/* Taglish/Language detection badge */}
                {broadcastIncident.description && (() => {
                  const lang = detectLanguage(broadcastIncident.description)
                  const colors: Record<string, string> = {
                    'Taglish': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                    'Tagalog': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                    'English': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                  }
                  return (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${colors[lang]}`}>
                      <Languages className="w-3 h-3" />
                      {lang} Detected
                    </span>
                  )
                })()}
              </div>

              {/* Detail Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailRow icon={<MapPin className="w-3.5 h-3.5" />} label="Location" value={broadcastIncident.location} />
                <DetailRow icon={<Clock className="w-3.5 h-3.5" />} label="Date Reported" value={formatDate(broadcastIncident.date_reported)} />
                <DetailRow icon={<Building2 className="w-3.5 h-3.5" />} label="Source" value={broadcastIncident.source_subsystem} />
                <DetailRow icon={<Tag className="w-3.5 h-3.5" />} label="Reported By" value={broadcastIncident.reported_by ?? 'Unknown'} />
              </div>

              {/* Original Description */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3 h-3" />
                  Original Incident Description
                </p>
                <div className="p-3 bg-muted/50 rounded-lg text-sm text-foreground leading-relaxed border border-border">
                  {broadcastIncident.description || <span className="text-muted-foreground italic">No description provided.</span>}
                </div>
              </div>

              {/* AI Summarization Section */}
              <div className="rounded-xl border border-primary/20 bg-primary/4 overflow-hidden">
                <div className="px-4 py-3 border-b border-primary/15 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  <p className="text-xs font-semibold text-foreground">AI Summarize Alert Message</p>
                  <span className="ml-auto text-[10px] text-muted-foreground">Choose a language to generate</span>
                </div>
                <div className="p-4 space-y-3">
                  {/* Language buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={broadcastLang === 'English' ? 'default' : 'outline'}
                      size="sm"
                      disabled={broadcastGenerating}
                      onClick={() => handleBroadcastGenerateAI('English')}
                      className="gap-2 text-xs"
                    >
                      {broadcastGenerating && broadcastLang === 'English'
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Sparkles className="w-3.5 h-3.5" />}
                      🇺🇸 English
                    </Button>
                    <Button
                      variant={broadcastLang === 'Tagalog' ? 'default' : 'outline'}
                      size="sm"
                      disabled={broadcastGenerating}
                      onClick={() => handleBroadcastGenerateAI('Tagalog')}
                      className="gap-2 text-xs"
                    >
                      {broadcastGenerating && broadcastLang === 'Tagalog'
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Sparkles className="w-3.5 h-3.5" />}
                      🇵🇭 Tagalog
                    </Button>
                  </div>

                  {/* Generating spinner */}
                  {broadcastGenerating && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                      <span>AI is generating your {broadcastLang} summary...</span>
                    </div>
                  )}

                  {/* Error */}
                  {broadcastAiError && !broadcastGenerating && (
                    <div className="p-3 rounded-lg bg-destructive/8 border border-destructive/20 text-xs text-destructive">
                      {broadcastAiError}
                    </div>
                  )}

                  {/* Preview of generated message */}
                  {broadcastAiMessage && !broadcastGenerating && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          AI Generated Preview ({broadcastLang})
                        </p>
                        <p className="text-[10px] text-muted-foreground">You can regenerate by clicking a language button again</p>
                      </div>
                      <div className="p-3 rounded-lg bg-card border border-primary/20 text-sm text-foreground leading-relaxed shadow-inner">
                        {broadcastAiMessage}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="flex-row items-center justify-between gap-2">
              <Button variant="outline" onClick={() => setBroadcastIncident(null)}>Cancel</Button>
              <div className="flex items-center gap-2">
                {/* Skip button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleProceedBroadcast(false)}
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Skip
                </Button>
                {/* Proceed with AI summary (only enabled when AI message exists) */}
                <Button
                  size="sm"
                  disabled={!broadcastAiMessage || broadcastGenerating}
                  onClick={() => handleProceedBroadcast(true)}
                  className="gap-1.5 text-xs font-bold"
                >
                  <Megaphone className="w-3.5 h-3.5" />
                  Proceed with AI Summary →
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Single Disregard Confirm Dialog */}
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
                This incident will be marked as <span className="font-semibold text-foreground">Disregarded</span> and removed from the active queue. It will still be accessible in Communication Logs.
              </p>
              <div className="mt-3 p-3 rounded-lg bg-muted/40 border border-border">
                <p className="text-xs font-semibold text-foreground">{disregardTarget.incident_type} — {disregardTarget.location}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{disregardTarget.description}</p>
              </div>
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

      {/* Bulk Disregard Confirm Dialog */}
      <Dialog open={bulkDisregardOpen} onOpenChange={(open) => !open && setBulkDisregardOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <DialogTitle>Disregard {selectedIds.size} Incidents?</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">This action will disregard all selected incidents.</p>
              </div>
            </div>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              All <span className="font-semibold text-foreground">{selectedIds.size} selected incidents</span> will be marked as Disregarded and removed from the active queue. They will still be visible in Communication Logs.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDisregardOpen(false)} disabled={disregarding}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDisregardConfirm} disabled={disregarding} className="gap-2">
              {disregarding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Disregard All Selected
            </Button>
          </DialogFooter>
        </DialogContent>
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
