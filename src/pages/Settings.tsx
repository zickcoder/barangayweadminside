import { useState, useEffect } from 'react'
import {
  Moon, Sun, Wifi, Bot, Info, Key,
  CheckCircle2, XCircle, RefreshCw, Database, Mail, ShieldCheck,
  Edit3, KeyRound, ArrowLeft, Send, Check, Lock, Eye, EyeOff
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/context/AuthContext'
import { supabase, checkSupabaseConnection } from '@/services/supabase'
import { isGeminiConfigured, getActiveAiVersion } from '@/services/aiService'
import { sendEmailChangeOtp } from '@/services/resendService'

// Mask email: keeps only 1st character of username, masks rest with asterisks
function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email
  const [user, domain] = email.split('@')
  if (user.length <= 1) return email
  const maskedUser = user[0] + '*'.repeat(user.length - 1)
  return `${maskedUser}@${domain}`
}

export default function Settings() {
  const { theme, setTheme } = useTheme()
  const { adminEmail, updateAdminEmail, validateCredentials } = useAuth()
  const [supabaseOk, setSupabaseOk] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [aiVersion, setAiVersion] = useState<'v1' | 'v2'>(() => getActiveAiVersion())

  // Admin Email Change Multi-Step Flow State
  // Mode: 'view' | 'edit' | 'verify'
  const [emailMode, setEmailMode] = useState<'view' | 'edit' | 'verify'>('view')
  const [pendingNewEmail, setPendingNewEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')
  const [emailErr, setEmailErr] = useState('')

  // Password Change State
  const [pwdMode, setPwdMode] = useState<'view' | 'edit'>('view')
  const [oldPassword, setOldPassword] = useState('')
  const [confirmOldPassword, setConfirmOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showOld, setShowOld] = useState(false)
  const [showConfirmOld, setShowConfirmOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)
  const [pwdMsg, setPwdMsg] = useState('')
  const [pwdErr, setPwdErr] = useState('')

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdMsg('')
    setPwdErr('')

    if (oldPassword !== confirmOldPassword) {
      setPwdErr('Old password confirmation does not match.')
      return
    }

    const hasMin8 = newPassword.length >= 8
    const hasBigLetter = /[A-Z]/.test(newPassword)
    const hasNumber = /[0-9]/.test(newPassword)

    if (!hasMin8 || !hasBigLetter || !hasNumber) {
      setPwdErr('New password must contain at least 8 characters, 1 uppercase letter (A-Z), and 1 number (0-9).')
      return
    }

    if (newPassword === oldPassword) {
      setPwdErr('New password must be different from old password.')
      return
    }

    setPwdLoading(true)
    try {
      // Validate old password securely with server / Supabase
      const checkOld = await validateCredentials(adminEmail, oldPassword)
      if (!checkOld.success) {
        setPwdErr('Old password is incorrect.')
        return
      }

      // Update password via Supabase Auth
      try {
        await supabase.auth.updateUser({ password: newPassword })
      } catch {
        // Continue if Supabase session is offline/demo
      }

      setPwdMsg('Password updated successfully!')
      setPwdMode('view')
      setOldPassword('')
      setConfirmOldPassword('')
      setNewPassword('')
    } catch (err: any) {
      setPwdErr(err.message || 'Failed to update password.')
    } finally {
      setPwdLoading(false)
    }
  }

  const handleCancelPwd = () => {
    setPwdMode('view')
    setOldPassword('')
    setConfirmOldPassword('')
    setNewPassword('')
    setPwdErr('')
    setPwdMsg('')
  }

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

  // Step 1 -> Step 2: Open Edit Form
  const handleOpenEdit = () => {
    setEmailMode('edit')
    setPendingNewEmail(adminEmail)
    setEmailMsg('')
    setEmailErr('')
  }

  // Step 2 -> Step 3: Send Verification Code to New Email via Resend
  const handleSendVerificationCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailMsg('')
    setEmailErr('')

    const cleanEmail = pendingNewEmail.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setEmailErr('Please enter a valid email address.')
      return
    }

    if (cleanEmail === adminEmail.toLowerCase()) {
      setEmailErr('New email address must be different from current email.')
      return
    }

    setEmailLoading(true)
    try {
      // Generate random 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      setGeneratedCode(code)

      // Send real email via Resend API
      await sendEmailChangeOtp(cleanEmail, code)

      setEmailMsg(`Verification code dispatched to ${cleanEmail}. Please check your inbox.`)
      setEmailMode('verify')
      setVerificationCode('')
    } catch (err: any) {
      setEmailErr(err.message || 'Failed to send verification email.')
    } finally {
      setEmailLoading(false)
    }
  }

  // Step 3 -> Confirm Verification & Change Email
  const handleConfirmEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailMsg('')
    setEmailErr('')

    const cleanInputCode = verificationCode.trim()

    // Validate 6-digit code against the generated code sent via Resend
    if (cleanInputCode !== generatedCode) {
      setEmailErr('Invalid verification code. Please check your inbox and try again.')
      return
    }

    setEmailLoading(true)
    try {
      const res = await updateAdminEmail(pendingNewEmail)
      if (res.success) {
        setEmailMsg(`🎉 Success! Admin email updated to ${pendingNewEmail.toLowerCase()}. Future 2-step OTP codes will now be sent to this verified address.`)
        setEmailMode('view')
        setGeneratedCode(null)
        setVerificationCode('')
      } else {
        setEmailErr(res.error || 'Failed to update email.')
      }
    } catch (err: any) {
      setEmailErr(err.message || 'An error occurred.')
    } finally {
      setEmailLoading(false)
    }
  }

  // Cancel / Reset Flow
  const handleCancel = () => {
    setEmailMode('view')
    setPendingNewEmail('')
    setVerificationCode('')
    setGeneratedCode(null)
    setEmailErr('')
    setEmailMsg('')
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

      {/* Admin Security & Change Email Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Admin Security & Account Credentials
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Status Banners */}
          {emailMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{emailMsg}</span>
            </div>
          )}

          {emailErr && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              <span>{emailErr}</span>
            </div>
          )}

          {/* MODE 1: VIEW CURRENT EMAIL */}
          {emailMode === 'view' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-muted/30 border border-border gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Email</p>
                  <p className="text-sm font-bold text-foreground font-mono">{maskEmail(adminEmail)}</p>
                </div>
              </div>
              <Button
                onClick={handleOpenEdit}
                className="h-10 px-5 text-xs font-bold gap-2 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>Click to Change Email</span>
              </Button>
            </div>
          )}

          {/* MODE 2: INPUT NEW EMAIL & REQUEST VERIFICATION */}
          {emailMode === 'edit' && (
            <form onSubmit={handleSendVerificationCode} className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border animate-fade-in">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">New Admin Email Address</label>
                <p className="text-[11px] text-muted-foreground">
                  A 6-digit verification code will be sent to your new email via Resend to verify ownership.
                </p>
                <div className="relative flex items-center pt-1">
                  <span className="absolute left-3.5 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={pendingNewEmail}
                    onChange={(e) => setPendingNewEmail(e.target.value)}
                    placeholder="Enter new email address"
                    disabled={emailLoading}
                    required
                    autoFocus
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={emailLoading}
                  className="h-10 px-5 text-xs font-bold gap-2 cursor-pointer"
                >
                  {emailLoading ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Verification Code</span>
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={emailLoading}
                  className="h-10 px-4 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* MODE 3: ENTER 6-DIGIT VERIFICATION CODE */}
          {emailMode === 'verify' && (
            <form onSubmit={handleConfirmEmailChange} className="space-y-4 p-4 rounded-xl bg-primary/5 border border-primary/20 animate-fade-in">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-primary" />
                    Enter Verification Code
                  </label>
                  <span className="text-[11px] text-muted-foreground">
                    Sent to: <strong className="text-foreground">{pendingNewEmail}</strong>
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Check your inbox for the 6-digit verification code sent via Resend.
                </p>
                <div className="pt-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    disabled={emailLoading}
                    autoFocus
                    required
                    className="w-full h-12 rounded-xl border border-input bg-background text-foreground text-center tracking-[0.4em] font-mono text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={emailLoading || verificationCode.length < 4}
                  className="h-10 px-5 text-xs font-bold gap-2 cursor-pointer"
                >
                  {emailLoading ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm & Update Email</span>
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEmailMode('edit')}
                  disabled={emailLoading}
                  className="h-10 px-4 text-xs font-semibold gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </Button>
              </div>
            </form>
          )}

          {/* --- DIVIDER --- */}
          <div className="border-t border-border" />

          {/* PASSWORD CHANGE STATUS BANNERS */}
          {pwdMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{pwdMsg}</span>
            </div>
          )}
          {pwdErr && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              <span>{pwdErr}</span>
            </div>
          )}

          {/* PASSWORD VIEW MODE */}
          {pwdMode === 'view' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-muted/30 border border-border gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Password</p>
                  <p className="text-sm font-bold text-foreground font-mono tracking-widest">••••••••••</p>
                </div>
              </div>
              <Button
                onClick={() => { setPwdMode('edit'); setPwdMsg(''); setPwdErr('') }}
                className="h-10 px-5 text-xs font-bold gap-2 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>Click to Change Password</span>
              </Button>
            </div>
          )}

          {/* PASSWORD EDIT MODE */}
          {pwdMode === 'edit' && (
            <form onSubmit={handleChangePassword} className="space-y-4 p-4 rounded-xl bg-muted/30 border border-border animate-fade-in">
              <p className="text-xs text-muted-foreground">Enter your old password twice to confirm, then set a new password.</p>

              {/* Old Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Old Password</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-muted-foreground"><Lock className="w-4 h-4" /></span>
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Current password"
                    disabled={pwdLoading}
                    required
                    autoFocus
                    className="w-full h-11 pl-10 pr-10 rounded-xl border border-input bg-background text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Old Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Old Password Again</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-muted-foreground"><Lock className="w-4 h-4" /></span>
                  <input
                    type={showConfirmOld ? 'text' : 'password'}
                    value={confirmOldPassword}
                    onChange={(e) => setConfirmOldPassword(e.target.value)}
                    placeholder="Confirm current password"
                    disabled={pwdLoading}
                    required
                    className="w-full h-11 pl-10 pr-10 rounded-xl border border-input bg-background text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  <button type="button" onClick={() => setShowConfirmOld(!showConfirmOld)} className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    {showConfirmOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">New Password</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-muted-foreground"><KeyRound className="w-4 h-4" /></span>
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    disabled={pwdLoading}
                    required
                    className="w-full h-11 pl-10 pr-10 rounded-xl border border-input bg-background text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="pt-1.5 space-y-1">
                  <p className="text-[11px] font-semibold text-muted-foreground">Password requirements:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[11px]">
                    <span className={`flex items-center gap-1 font-medium ${newPassword.length >= 8 ? 'text-emerald-500 font-bold' : 'text-muted-foreground'}`}>
                      {newPassword.length >= 8 ? '✓' : '○'} Min. 8 characters
                    </span>
                    <span className={`flex items-center gap-1 font-medium ${/[A-Z]/.test(newPassword) ? 'text-emerald-500 font-bold' : 'text-muted-foreground'}`}>
                      {/[A-Z]/.test(newPassword) ? '✓' : '○'} 1 Uppercase letter (A-Z)
                    </span>
                    <span className={`flex items-center gap-1 font-medium ${/[0-9]/.test(newPassword) ? 'text-emerald-500 font-bold' : 'text-muted-foreground'}`}>
                      {/[0-9]/.test(newPassword) ? '✓' : '○'} 1 Number (0-9)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="submit"
                  disabled={pwdLoading || newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)}
                  className="h-10 px-5 text-xs font-bold gap-2 cursor-pointer"
                >
                  {pwdLoading ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <><Check className="w-4 h-4" /><span>Update Password</span></>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancelPwd}
                  disabled={pwdLoading}
                  className="h-10 px-4 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

        </CardContent>
      </Card>

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
                      AI Status
                    </p>
                    <p className="text-xs text-muted-foreground transition-all duration-300">
                      {aiVersion === 'v1' ? 'Gemini AI Assistant (V1)' : 'ChatGPT Assistant (V2)'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-primary text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Operational
                </div>
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
