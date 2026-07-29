import { useState, useEffect } from 'react'
import {
  Moon, Sun, Wifi, Bot, Info, Key,
  CheckCircle2, XCircle, RefreshCw, Database,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import { checkSupabaseConnection } from '@/services/supabase'
import { isGeminiConfigured, getActiveAiVersion } from '@/services/aiService'

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const [supabaseOk, setSupabaseOk] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [aiVersion, setAiVersion] = useState<'v1' | 'v2'>(() => getActiveAiVersion())

  const geminiOk = isGeminiConfigured()

  const handleToggleAiVersion = () => {
    const next: 'v1' | 'v2' = aiVersion === 'v1' ? 'v2' : 'v1'
    setAiVersion(next)
    localStorage.setItem('barangay_ai_version', next)
  }

  const handleCheckSupabase = async () => {
    setChecking(true)
    try {
      const ok = await checkSupabaseConnection()
      setSupabaseOk(ok)
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    handleCheckSupabase()
  }, [])

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="page-title">Settings</h2>
        <p className="page-subtitle">System configuration and preferences</p>
      </div>

      {/* Top Section: Side by side layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Appearance */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose between Light and Dark mode for the admin portal.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center gap-3 p-4 sm:p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                  theme === 'light'
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-muted/30 hover:bg-muted/50'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-[#FAFBF7] border border-[#DCEBDD] flex items-center justify-center shadow-sm">
                  <Sun className="w-6 h-6 text-[#2E8B47]" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Light Mode</p>
                  <p className="text-xs text-muted-foreground">Barangay Daylight</p>
                </div>
                {theme === 'light' && (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                )}
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center gap-3 p-4 sm:p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                  theme === 'dark'
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-muted/30 hover:bg-muted/50'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-[#1B221A] border border-[#2C362C] flex items-center justify-center shadow-sm">
                  <Moon className="w-6 h-6 text-[#4CAF6B]" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">Dark Mode</p>
                  <p className="text-xs text-muted-foreground">Barangay Daylight (Dark)</p>
                </div>
                {theme === 'dark' && (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Integration Status */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">Integration Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Supabase */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-muted/40 border border-border gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <Database className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Supabase Database</p>
                  <p className="text-xs text-muted-foreground">Active Connection</p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-border">
                {supabaseOk === null ? (
                  <span className="text-xs text-muted-foreground">Checking...</span>
                ) : supabaseOk ? (
                  <div className="flex items-center gap-1.5 text-primary text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Connected
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-destructive text-xs font-semibold">
                    <XCircle className="w-4 h-4" />
                    Failed
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCheckSupabase}
                  disabled={checking}
                  className="w-8 h-8"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {/* Gemini AI with V1/V2 toggle */}
            <div className="flex flex-col p-4 rounded-xl bg-muted/40 border border-border gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground transition-all duration-300">
                      {aiVersion === 'v1' ? 'Gemini AI V1' : 'Gemini AI V2'}
                    </p>
                    <p className="text-xs text-muted-foreground transition-all duration-300">
                      {aiVersion === 'v1' ? 'Standard Gemini Assistant' : 'ChatGPT Assistant (OpenRouter)'}
                    </p>
                  </div>
                </div>
                {geminiOk ? (
                  <div className="flex items-center gap-1.5 text-primary text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Ready
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-amber-500 text-xs font-semibold">
                    <Key className="w-4 h-4" />
                    Not Configured
                  </div>
                )}
              </div>

              {/* Animated Sliding Pill Toggle */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">AI Engine:</span>
                <button
                  onClick={handleToggleAiVersion}
                  title={`Switch to ${aiVersion === 'v1' ? 'V2 (ChatGPT)' : 'V1 (Gemini)'}`}
                  className="relative w-32 h-8 rounded-full bg-muted border border-border flex items-center cursor-pointer select-none shadow-inner overflow-hidden"
                  style={{ padding: '3px' }}
                >
                  {/* Sliding backdrop */}
                  <div
                    className="absolute top-[3px] bottom-[3px] rounded-full bg-primary shadow transition-all duration-300 ease-in-out"
                    style={{
                      width: 'calc(50% - 3px)',
                      left: aiVersion === 'v1' ? '3px' : 'calc(50%)',
                    }}
                  />
                  <span
                    className="relative z-10 flex-1 text-center text-[11px] font-bold transition-colors duration-300"
                    style={{ color: aiVersion === 'v1' ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))' }}
                  >
                    V1
                  </span>
                  <span
                    className="relative z-10 flex-1 text-center text-[11px] font-bold transition-colors duration-300"
                    style={{ color: aiVersion === 'v2' ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))' }}
                  >
                    V2
                  </span>
                </button>
                <span className="text-[10px] text-muted-foreground italic">
                  {aiVersion === 'v1' ? 'Using Gemini' : 'Using ChatGPT'}
                </span>
              </div>
            </div>

            {/* API Listener */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/40 border border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Wifi className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">API Integration Listener</p>
                  <p className="text-xs text-muted-foreground">
                    External Subsystem Handler
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-primary text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                Running
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Centered System Info */}
      <div className="flex justify-center pt-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 justify-center">
              <Info className="w-4 h-4 text-primary" />
              System Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Application', value: 'Barangay 178 Emergency Communication System' },
                { label: 'Portal', value: 'Administrator Portal' },
                { label: 'Version', value: '1.0.0' },
                { label: 'Location', value: 'Barangay 178, Camarin, Caloocan City' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
                  <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                  <span className="text-xs text-foreground font-medium text-right">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
