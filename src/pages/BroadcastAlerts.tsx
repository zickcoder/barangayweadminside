import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Bot, Check, Wand2, Send, Trash2,
  Smartphone, AlertTriangle, Eye, X, Loader2, CheckCircle2, MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertPriorityBadge } from '@/components/shared/StatusBadge'
import { useBroadcastAlert } from '@/hooks/useAlerts'
import { generateEnglishAlert, generateTagalogAlert, isGeminiConfigured } from '@/services/aiService'
import { updateIncidentStatus } from '@/services/incidentApi'
import type { BroadcastFormData, IncomingIncident } from '@/types'

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(5, 'Message must be at least 5 characters'),
  location: z.string().optional(),
  priority: z.enum(['WARNING', 'EMERGENCY']),
  emergency_type: z.enum(['FIRE', 'FLOOD', 'CRIME', 'MEDICAL', 'EARTHQUAKE', 'OTHER']),
  language: z.enum(['English', 'Tagalog']),
  channel: z.literal('Mobile Application'),
  operator: z.string().min(1, 'Operator name is required'),
})

type FormValues = z.infer<typeof schema>

export default function BroadcastAlerts() {
  const location = useLocation()
  const navigate = useNavigate()
  const prefillIncident = location.state?.incident as IncomingIncident | undefined
  const prefilledMessage = location.state?.prefilledMessage as string | undefined
  const broadcastMutation = useBroadcastAlert()

  const [previewOpen, setPreviewOpen] = useState(false)
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [isBroadcasting, setIsBroadcasting] = useState(false)

  // AI & Right panel state
  const [generatingAi, setGeneratingAi] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Tagalog' | null>(null)
  const [aiError, setAiError] = useState('')
  const [panelVisible, setPanelVisible] = useState(!!prefillIncident)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: prefillIncident ? `${prefillIncident.incident_type} Alert — ${prefillIncident.location}` : '',
      description: prefilledMessage ?? prefillIncident?.description ?? '',
      location: prefillIncident?.location ?? '',
      priority: (prefillIncident?.priority === 'CRITICAL' || prefillIncident?.priority === 'HIGH') ? 'EMERGENCY' : 'WARNING',
      emergency_type: (prefillIncident?.incident_type as FormValues['emergency_type']) ?? 'OTHER',
      language: 'English',
      channel: 'Mobile Application',
      operator: 'Administrator',
    },
  })

  // Sync form values whenever navigation or state changes
  useEffect(() => {
    if (prefillIncident) {
      reset({
        title: `${prefillIncident.incident_type} Alert — ${prefillIncident.location}`,
        description: prefilledMessage ?? prefillIncident.description ?? '',
        location: prefillIncident.location ?? '',
        priority: (prefillIncident.priority === 'CRITICAL' || prefillIncident.priority === 'HIGH') ? 'EMERGENCY' : 'WARNING',
        emergency_type: (prefillIncident.incident_type as FormValues['emergency_type']) ?? 'OTHER',
        language: 'English',
        channel: 'Mobile Application',
        operator: 'Administrator',
      })
      setPanelVisible(true)
      setAiError('')
    } else {
      // Direct navigation (e.g. clicking Broadcast Alerts from sidebar) -> Clean refresh
      reset({
        title: '',
        description: '',
        location: '',
        priority: 'WARNING',
        emergency_type: 'OTHER',
        language: 'English',
        channel: 'Mobile Application',
        operator: 'Administrator',
      })
      setPanelVisible(false)
      setAiError('')
    }
  }, [location.key, location.state, prefillIncident?.id, prefilledMessage])

  const watchedValues = watch()

  const getAiContext = () => {
    // Always prefer the original raw report over the edited form field
    const rawDescription = (prefillIncident?.description || watchedValues.description || '').trim()
    return {
      incidentType: watchedValues.emergency_type as 'FIRE' | 'FLOOD' | 'CRIME' | 'MEDICAL' | 'EARTHQUAKE' | 'OTHER',
      priority: (prefillIncident?.priority ?? 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
      location: (prefillIncident?.location ?? 'Barangay 178, Camarin, Caloocan City').trim(),
      description: rawDescription,
    }
  }

  const handleGenerateAi = async (lang: 'English' | 'Tagalog') => {
    if (!isGeminiConfigured()) {
      setAiError('Gemini API key is not configured. Add VITE_GEMINI_API_KEY to your .env file.')
      return
    }
    const ctx = getAiContext()
    if (!ctx.description) {
      setAiError('No incident description found. Fill in the Alert Message field or open this from an incoming incident.')
      return
    }
    setAiError('')
    setGeneratingAi(true)
    setSelectedLanguage(lang)
    try {
      const text = lang === 'English'
        ? await generateEnglishAlert(ctx)
        : await generateTagalogAlert(ctx)
      setValue('language', lang)
      setValue('description', text)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate alert')
    } finally {
      setGeneratingAi(false)
      setSelectedLanguage(null)
    }
  }

  const handleBroadcastClick = () => {
    handleSubmit(() => setPreviewOpen(true))()
  }

  const handleCloseSuccessModal = () => {
    setSuccessModalOpen(false)

    // Smooth transition: reset form after modal fade-out
    setTimeout(() => {
      reset({
        title: '',
        description: '',
        location: '',
        priority: 'WARNING',
        emergency_type: 'OTHER',
        language: 'English',
        channel: 'Mobile Application',
        operator: 'Administrator',
      })
      setPanelVisible(false)
      // Clear location state history
      if (typeof window !== 'undefined' && window.history?.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname)
      }
    }, 200)
  }

  const onBroadcastConfirm = async (data: FormValues) => {
    setIsBroadcasting(true)
    try {
      await broadcastMutation.mutateAsync({
        form: data as BroadcastFormData,
        incidentId: prefillIncident?.id,
      })

      if (prefillIncident?.id) {
        await updateIncidentStatus(prefillIncident.id, 'Broadcasted')
      }

      setTimeout(() => {
        setIsBroadcasting(false)
        setPreviewOpen(false)
        setSuccessModalOpen(true)
      }, 700)
    } catch (err) {
      setIsBroadcasting(false)
      console.error('Broadcast failed:', err)
    }
  }

  const defaultDescription = (prefillIncident?.description ?? '').trim()
  const showRightPanel = panelVisible && !!prefillIncident

  return (
    <div className="space-y-5">
      <div>
        <h2 className="page-title">Broadcast Alerts</h2>
        <p className="page-subtitle">
          Compose and broadcast emergency notifications to residents
        </p>
      </div>

      {/* Pre-fill notice */}
      {prefillIncident && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-accent/30 bg-accent/8">
          <AlertTriangle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Pre-filled from Incident: <span className="font-mono text-accent">{prefillIncident.incident_id}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {prefillIncident.source_subsystem} · {prefillIncident.location}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
            onClick={() => {
              navigate('/broadcast', { replace: true, state: null })
            }}
          >
            Clear Prefill
          </Button>
        </div>
      )}

      <div className={`grid gap-5 ${showRightPanel ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-2xl mx-auto w-full'}`}>
        {/* ─── LEFT: Broadcast Form ─── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Send className="w-4 h-4 text-primary" />
              </div>
              <CardTitle>Broadcast Form</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title">Alert Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Fire Emergency — Zone 4, Camarin"
                  {...register('title')}
                />
                {errors.title && (
                  <p className="text-xs text-destructive">{errors.title.message}</p>
                )}
              </div>

              {/* Incident Location (Only for Manual Broadcast) */}
              {!prefillIncident && (
                <div className="space-y-1.5">
                  <Label htmlFor="location" className="flex items-center justify-between">
                    <span>Incident Location *</span>
                    <span className="text-[10px] text-muted-foreground font-normal">e.g. Zone 3, Phase 2, Barangay 178</span>
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="location"
                      placeholder="e.g. Zone 4, Camarin, Barangay 178"
                      className="pl-9"
                      {...register('location')}
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description">Alert Message *</Label>
                <Textarea
                  id="description"
                  placeholder="Official alert message to be sent to residents..."
                  rows={5}
                  {...register('description')}
                />
                {errors.description && (
                  <p className="text-xs text-destructive">{errors.description.message}</p>
                )}

                {/* Summarize AI alert buttons below input box */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 px-0.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] font-medium">Summarize AI Alert:</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={generatingAi || (!defaultDescription && !watchedValues.description?.trim())}
                      onClick={() => handleGenerateAi('English')}
                      className="h-7 px-2.5 text-[11px] font-medium gap-1 hover:border-primary/50 hover:bg-primary/5"
                    >
                      {generatingAi && selectedLanguage === 'English' ? (
                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                      ) : (
                        <Wand2 className="w-3 h-3 text-primary" />
                      )}
                      English
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={generatingAi || (!defaultDescription && !watchedValues.description?.trim())}
                      onClick={() => handleGenerateAi('Tagalog')}
                      className="h-7 px-2.5 text-[11px] font-medium gap-1 hover:border-primary/50 hover:bg-primary/5"
                    >
                      {generatingAi && selectedLanguage === 'Tagalog' ? (
                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                      ) : (
                        <Wand2 className="w-3 h-3 text-primary" />
                      )}
                      Tagalog
                    </Button>
                  </div>
                </div>
                {generatingAi && (
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span>AI is summarizing alert in {selectedLanguage}...</span>
                  </div>
                )}
                {aiError && (
                  <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-lg mt-1">{aiError}</p>
                )}
              </div>

              {/* Priority + Emergency Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="priority">Alert Style *</Label>
                  <Select id="priority" {...register('priority')}>
                    <option value="WARNING">🔔 Notification</option>
                    <option value="EMERGENCY">🚨 Emergency Notification</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emergency_type">Emergency Type *</Label>
                  <Select id="emergency_type" {...register('emergency_type')}>
                    <option value="FIRE">🔥 Fire</option>
                    <option value="FLOOD">🌊 Flood</option>
                    <option value="CRIME">🚔 Crime</option>
                    <option value="MEDICAL">🏥 Medical</option>
                    <option value="EARTHQUAKE">⛰️ Earthquake</option>
                    <option value="OTHER">📋 Other</option>
                  </Select>
                </div>
              </div>

              {/* Channel */}
              <div className="space-y-1.5">
                <Label htmlFor="channel">
                  <Smartphone className="w-3.5 h-3.5 inline mr-1" />
                  Channels To Notify
                </Label>
                <Select id="channel" {...register('channel')} disabled>
                  <option value="Mobile Application">📱 Mobile Application</option>
                </Select>
              </div>

              {/* Operator */}
              <div className="space-y-1.5">
                <Label htmlFor="operator">Operator Name</Label>
                <Input
                  id="operator"
                  placeholder="Administrator"
                  {...register('operator')}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { reset(); setPanelVisible(false) }}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </Button>
                <Button
                  type="button"
                  onClick={handleBroadcastClick}
                  disabled={broadcastMutation.isPending}
                  className="flex-1 gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {broadcastMutation.isPending ? 'Broadcasting...' : 'Broadcast'}
                </Button>
              </div>

              {broadcastMutation.isError && (
                <p className="text-xs text-destructive text-center font-medium bg-destructive/10 p-2.5 rounded-lg border border-destructive/25">
                  Broadcast failed: {broadcastMutation.error instanceof Error ? broadcastMutation.error.message : 'Please check your connection.'}
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* ─── RIGHT: Default Incident Description Only ─── */}
        {showRightPanel && (
          <div className="space-y-4">
            <Card className="border-border">
              <CardHeader className="pb-3 border-b border-border bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                      <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">Default Incident Description</CardTitle>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Original report from incident</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setPanelVisible(false)}
                    title="Hide Panel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs text-foreground leading-relaxed">
                  {defaultDescription || <span className="text-muted-foreground italic">No default description available.</span>}
                </div>
                {defaultDescription && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 text-xs"
                    onClick={() => setValue('description', defaultDescription)}
                  >
                    <Check className="w-3.5 h-3.5" /> Use Original Description
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Preview + Confirm Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Preview Alert</DialogTitle>
            <p className="text-xs text-muted-foreground">Review before broadcasting to residents</p>
          </DialogHeader>

          <div className="bg-muted/50 rounded-xl p-5 space-y-3 border border-border">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="font-bold text-foreground font-display">{watchedValues.title || '—'}</p>
                <div className="flex gap-2 mt-1">
                  <AlertPriorityBadge priority={watchedValues.priority} />
                  <span className="text-xs text-muted-foreground">· {watchedValues.emergency_type}</span>
                </div>
              </div>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              {watchedValues.description || 'No message entered.'}
            </p>
            <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-2 border-t border-border">
              <span>📱 {watchedValues.channel}</span>
              <span>👤 {watchedValues.operator || 'Administrator'}</span>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPreviewOpen(false)}
              disabled={isBroadcasting || broadcastMutation.isPending}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Cancel Broadcast
            </Button>
            <Button
              onClick={handleSubmit(onBroadcastConfirm)}
              disabled={isBroadcasting || broadcastMutation.isPending}
              className="gap-2 min-w-[140px]"
            >
              {isBroadcasting || broadcastMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Broadcasting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Broadcast Now
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Broadcast Success Modal ─── */}
      <Dialog open={successModalOpen} onOpenChange={(open) => { if (!open) handleCloseSuccessModal() }}>
        <DialogContent className="max-w-sm text-center p-6 space-y-4 animate-in fade-in-0 zoom-in-95 duration-200">
          <DialogHeader className="space-y-3">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-9 h-9 text-emerald-500" />
            </div>
            <DialogTitle className="text-xl font-extrabold text-foreground tracking-tight">
              Broadcasted Successfully!
            </DialogTitle>
            <p className="text-sm text-muted-foreground font-medium">
              The emergency alert has been sent.
            </p>
          </DialogHeader>

          <DialogFooter className="pt-2">
            <Button
              onClick={handleCloseSuccessModal}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all duration-300 hover:scale-[1.02] active:scale-95 gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
