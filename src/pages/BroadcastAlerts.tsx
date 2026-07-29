import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Bot, Check, Wand2, Send, Trash2,
  Smartphone, AlertTriangle, Eye, X, Loader2,
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
  priority: z.enum(['NORMAL', 'WARNING', 'EMERGENCY']),
  emergency_type: z.enum(['FIRE', 'FLOOD', 'CRIME', 'MEDICAL', 'EARTHQUAKE', 'OTHER']),
  language: z.enum(['English', 'Tagalog']),
  channel: z.literal('Mobile Application'),
  operator: z.string().min(1, 'Operator name is required'),
})

type FormValues = z.infer<typeof schema>

export default function BroadcastAlerts() {
  const location = useLocation()
  const prefillIncident = location.state?.incident as IncomingIncident | undefined
  const prefilledMessage = location.state?.prefilledMessage as string | undefined
  const isAiPreFilled = location.state?.isAiPreFilled as boolean | undefined
  const broadcastMutation = useBroadcastAlert()

  const [previewOpen, setPreviewOpen] = useState(false)
  const [broadcastSuccess, setBroadcastSuccess] = useState(false)

  // Right panel state
  const [aiMessage, setAiMessage] = useState('')
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
      priority: prefillIncident?.priority === 'CRITICAL' ? 'EMERGENCY' :
                prefillIncident?.priority === 'HIGH' ? 'WARNING' : 'NORMAL',
      emergency_type: (prefillIncident?.incident_type as FormValues['emergency_type']) ?? 'OTHER',
      language: 'English',
      channel: 'Mobile Application',
      operator: 'Administrator',
    },
  })

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
      setAiMessage(text)
      setValue('language', lang)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to generate alert')
    } finally {
      setGeneratingAi(false)
      setSelectedLanguage(null)
    }
  }

  const handleBroadcastClick = () => {
    // Show the preview panel on the right and open the dialog
    setPanelVisible(true)
    handleSubmit(() => setPreviewOpen(true))()
  }

  const onBroadcastConfirm = async (data: FormValues) => {
    try {
      await broadcastMutation.mutateAsync({
        form: data as BroadcastFormData,
        incidentId: prefillIncident?.id,
      })

      if (prefillIncident?.id) {
        await updateIncidentStatus(prefillIncident.id, 'Broadcasted')
      }

      setPreviewOpen(false)
      setBroadcastSuccess(true)
      setTimeout(() => {
        setBroadcastSuccess(false)
        reset()
        setAiMessage('')
        setPanelVisible(false)
      }, 3000)
    } catch (err) {
      console.error('Broadcast failed:', err)
    }
  }

  const defaultDescription = prefillIncident?.description ?? ''

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
          <div>
            <p className="text-sm font-semibold text-foreground">
              Pre-filled from Incident: <span className="font-mono text-accent">{prefillIncident.incident_id}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {prefillIncident.source_subsystem} · {prefillIncident.location}
            </p>
          </div>
        </div>
      )}

      {/* Broadcast Success */}
      {broadcastSuccess && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-primary/30 bg-primary/8 animate-fade-in">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Send className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">Alert Broadcasted Successfully!</p>
            <p className="text-xs text-muted-foreground">
              The emergency alert has been sent to all resident mobile applications via Supabase Realtime.
            </p>
          </div>
        </div>
      )}

      <div className={`grid gap-5 ${panelVisible ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-2xl mx-auto w-full'}`}>
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
              </div>

              {/* Priority + Emergency Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="priority">Priority *</Label>
                  <Select id="priority" {...register('priority')}>
                    <option value="NORMAL">🟢 Normal</option>
                    <option value="WARNING">🟡 Warning</option>
                    <option value="EMERGENCY">🔴 Emergency</option>
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
                  Channel
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
                  onClick={() => { reset(); setAiMessage(''); setPanelVisible(false) }}
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

        {/* ─── RIGHT: AI Summarized + Default Message ─── */}
        {panelVisible && (
          <div className="space-y-4">
            {/* AI Summarized Message */}
            {!isAiPreFilled && (
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">AI Summarized Message</CardTitle>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Gemini-generated alert text</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleGenerateAi('English')}
                        disabled={generatingAi || !isGeminiConfigured() || !(defaultDescription || watchedValues.description?.trim())}
                        title={!(defaultDescription || watchedValues.description?.trim()) ? 'Enter a description or open from an incoming incident first' : undefined}
                        className="gap-1.5 text-[11px] font-bold shadow-sm h-9 flex-1"
                      >
                        {generatingAi && selectedLanguage === 'English' ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                        ) : (
                          <><Wand2 className="w-3.5 h-3.5" /> English Alert</>
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleGenerateAi('Tagalog')}
                        disabled={generatingAi || !isGeminiConfigured() || !(defaultDescription || watchedValues.description?.trim())}
                        title={!(defaultDescription || watchedValues.description?.trim()) ? 'Enter a description or open from an incoming incident first' : undefined}
                        className="gap-1.5 text-[11px] font-bold shadow-sm h-9 flex-1 border border-border"
                      >
                        {generatingAi && selectedLanguage === 'Tagalog' ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                        ) : (
                          <><Wand2 className="w-3.5 h-3.5" /> Tagalog Alert</>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!isGeminiConfigured() && (
                    <div className="p-3 rounded-lg bg-accent/10 border border-accent/25 text-xs text-accent-foreground">
                      <p className="font-semibold">⚠️ API Key Required</p>
                      <p className="text-muted-foreground mt-0.5">
                        Set <code className="bg-muted px-1 rounded">VITE_GEMINI_API_KEY</code> in your{' '}
                        <code className="bg-muted px-1 rounded">.env</code> file to enable AI generation.
                      </p>
                    </div>
                  )}
                  {aiError && (
                    <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-lg">{aiError}</p>
                  )}
                  <div className="min-h-[100px] p-3 rounded-xl bg-background border border-border text-sm text-foreground leading-relaxed">
                    {generatingAi ? (
                      <div className="space-y-2">
                        <div className="skeleton h-3 w-full rounded" />
                        <div className="skeleton h-3 w-5/6 rounded" />
                        <div className="skeleton h-3 w-4/5 rounded" />
                      </div>
                    ) : aiMessage ? (
                      <p>{aiMessage}</p>
                    ) : !(defaultDescription || watchedValues.description?.trim()) ? (
                      <p className="text-muted-foreground italic text-xs">
                        ⚠️ No incident description detected. Open this page from an incoming incident report, or type a description in the Alert Message field on the left first.
                      </p>
                    ) : (
                      <p className="text-muted-foreground italic text-xs">
                        Click "Summarize Alert" to rewrite the incident report into a broadcast-ready emergency alert.
                      </p>
                    )}
                  </div>
                  {aiMessage && (
                    <Button
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => setValue('description', aiMessage)}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Use This Message
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Default Description */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">Default Incident Description</CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Original report from incident</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="min-h-[100px] p-3 rounded-xl bg-background border border-border text-sm text-foreground leading-relaxed">
                  {defaultDescription ? (
                    <p>{defaultDescription}</p>
                  ) : (
                    <p className="text-muted-foreground italic text-xs">
                      No default description available. Fill in the Alert Message field on the left.
                    </p>
                  )}
                </div>
                {defaultDescription && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => setValue('description', defaultDescription)}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Use This Message
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Close panel */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-muted-foreground"
              onClick={() => setPanelVisible(false)}
            >
              <X className="w-3.5 h-3.5" />
              Hide Panel
            </Button>
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
            <Button variant="outline" onClick={() => setPreviewOpen(false)} className="gap-2">
              <X className="w-4 h-4" />
              Cancel Broadcast
            </Button>
            <Button
              onClick={handleSubmit(onBroadcastConfirm)}
              disabled={broadcastMutation.isPending}
              className="gap-2"
            >
              <Send className="w-4 h-4" />
              {broadcastMutation.isPending ? 'Broadcasting...' : 'Broadcast Now'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
