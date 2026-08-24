import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/hooks/useTheme'
import { Mail, Lock, KeyRound, ArrowLeft, ShieldAlert, Sun, Moon, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
    const {
    isAuthenticated,
    isLockedOut,
    lockoutUntil,
    adminEmail,
    validateCredentials,
    recordFailedAttempt,
    resetAttempts,
    sendOtpCode,
    verifyOtpCode,
  } = useAuth()

  // Countdown timer for 5-minute lockout
  const [timeLeftStr, setTimeLeftStr] = useState('')

  useEffect(() => {
    if (!isLockedOut || !lockoutUntil) {
      setTimeLeftStr('')
      return
    }

    const updateTimer = () => {
      const remainingMs = lockoutUntil - Date.now()
      if (remainingMs <= 0) {
        setTimeLeftStr('00:00')
      } else {
        const totalSec = Math.floor(remainingMs / 1000)
        const mins = Math.floor(totalSec / 60).toString().padStart(2, '0')
        const secs = (totalSec % 60).toString().padStart(2, '0')
        setTimeLeftStr(`${mins}:${secs}`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [isLockedOut, lockoutUntil])

  // Form State
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [otpAttempts, setOtpAttempts] = useState(0)
  
  // UI State
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null)

  // OTP 5-minute expiry timer
  const [otpExpiry, setOtpExpiry] = useState<number | null>(null)
  const [otpTimeLeftStr, setOtpTimeLeftStr] = useState('')

  useEffect(() => {
    if (!otpExpiry) {
      setOtpTimeLeftStr('')
      return
    }
    const updateOtpTimer = () => {
      const remaining = otpExpiry - Date.now()
      if (remaining <= 0) {
        setOtpTimeLeftStr('00:00')
        setOtpExpiry(null)
        setStep('credentials')
        setOtpCode('')
        setOtpAttempts(0)
        setSuccessMsg('')
        setErrorMsg('OTP code expired. Please log in again.')
        return
      }
      const totalSec = Math.floor(remaining / 1000)
      const mins = Math.floor(totalSec / 60).toString().padStart(2, '0')
      const secs = (totalSec % 60).toString().padStart(2, '0')
      setOtpTimeLeftStr(`${mins}:${secs}`)
    }
    updateOtpTimer()
    const interval = setInterval(updateOtpTimer, 1000)
    return () => clearInterval(interval)
  }, [otpExpiry])

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true })
    }
  }, [isAuthenticated, navigate])

  // Handle Step 1: Credentials Submission
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (isLockedOut) {
      setErrorMsg(`Locked! Please wait until the 5-minute timer expires (${timeLeftStr || '05:00'}).`)
      return
    }

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.')
      return
    }

    setLoading(true)
    try {
      // Secure server-side / Supabase credential verification
      const authCheck = await validateCredentials(email, password)
      if (authCheck.success) {
        const otpResult = await sendOtpCode(email)
        setOtpExpiry(Date.now() + 5 * 60 * 1000) // start 5-min OTP timer
        if (otpResult.error) {
          setSuccessMsg(`OTP screen ready. Note: ${otpResult.error}`)
        } else {
          setSuccessMsg('Security OTP code sent to your email. Check your inbox!')
        }
        setStep('otp')
        setOtpAttempts(0) // reset OTP attempt counter
      } else {
        // Failed credentials attempt
        const remaining = recordFailedAttempt()
        setAttemptsLeft(remaining)
        if (remaining > 0) {
          setErrorMsg(`Invalid email or password. You have ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`)
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Step 2: OTP Verification Submission (Max 3 Attempts Limit -> Goes back to Credentials)
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!otpCode.trim()) {
      setErrorMsg('Please enter the 6-digit code sent to your email.')
      return
    }

    setLoading(true)
    try {
      const res = await verifyOtpCode(email, otpCode)
      if (res.success) {
        setSuccessMsg('Authentication successful! Access granted.')
        setTimeout(() => {
          navigate('/dashboard', { replace: true })
        }, 500)
      } else {
        const nextAttempts = otpAttempts + 1
        setOtpAttempts(nextAttempts)

        if (nextAttempts >= 3) {
          // Exceeded 3 OTP attempts -> Return to Login (Step 1)
          setStep('credentials')
          setOtpCode('')
          setOtpAttempts(0)
          setErrorMsg('Maximum 3 invalid code attempts reached. Returning to login screen. Please log in again.')
        } else {
          const remaining = 3 - nextAttempts
          setErrorMsg(`Invalid security code. Attempt ${nextAttempts} of 3 (${remaining} attempt${remaining === 1 ? '' : 's'} remaining before reset).`)
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed.')
    } finally {
      setLoading(false)
    }
  }

  // Handle Back Button
  const handleBackToCredentials = () => {
    setStep('credentials')
    setOtpCode('')
    setOtpAttempts(0)
    setErrorMsg('')
    setSuccessMsg('')
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 bg-background transition-colors duration-300 relative overflow-hidden">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[130px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-[1100px] min-h-[640px] bg-card border border-border rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-2 relative z-10 animate-fade-in">
        
        {/* Dark / Light Mode Floating Toggle Button with Hover Animation */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/80 hover:bg-muted border border-border text-xs font-semibold text-foreground transition-all duration-300 hover:scale-105 hover:border-primary/50 hover:shadow-md hover:shadow-primary/20 active:scale-95 cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-emerald-400" />
                <span>Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Light Mode</span>
              </>
            )}
          </button>
        </div>

        {/* Left Column: Throbbing Logo (No Outline, Clickable to Facebook) & System Branding */}
        <div className="flex flex-col items-center justify-center p-8 lg:p-12 bg-gradient-to-br from-primary/10 via-muted/30 to-background border-b lg:border-b-0 lg:border-r border-border relative overflow-hidden">
          {/* Subtle Ambient Backing */}
          <div className="absolute inset-0 bg-grid-white/5 bg-[size:20px_20px] pointer-events-none" />
          
          <div className="relative group text-center flex flex-col items-center">
            {/* Standalone Throbbing Logo (Clickable -> Facebook Page) */}
            <a
              href="https://www.facebook.com/profile.php?id=100076316373340"
              target="_blank"
              rel="noopener noreferrer"
              title="Visit Barangay 178 Official Facebook Page"
              className="inline-block cursor-pointer transition-transform duration-300 hover:scale-110 mx-auto"
            >
              <img
                src="/logo.png"
                alt="Barangay 178 Logo"
                className="w-48 h-48 sm:w-56 sm:h-56 lg:w-[250px] lg:h-[250px] object-contain animate-throb"
              />
            </a>
            
            {/* System Badge */}
            <div className="mt-6 space-y-1">
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight font-display">
                BARANGAY 178
              </h1>
              <p className="text-xs md:text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                Emergency Communication System
              </p>
              <p className="text-xs text-muted-foreground pt-1">
                Camarin, Caloocan City
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <ShieldCheck className="w-4 h-4" />
            <span>Secure Admin Portal</span>
          </div>
        </div>

        {/* Right Column: Form Area */}
        <div className="p-8 md:p-12 lg:p-14 flex flex-col justify-center relative">
          
          {/* Header Title */}
          <div className="mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight font-display">
              Admin Login
            </h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-1">
              {step === 'credentials'
                ? 'Enter your administrator credentials to continue.'
                : 'Enter the 6-digit OTP code sent to your email.'}
            </p>
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-start gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">{successMsg}</div>
            </div>
          )}

          {/* Locked Out Warning with 5-Minute Countdown Timer & Dev Override */}
          {isLockedOut && step === 'credentials' && (
            <div className="mb-6 p-4 rounded-xl bg-destructive/15 border border-destructive/30 text-center space-y-2">
              <ShieldAlert className="w-8 h-8 text-destructive mx-auto animate-pulse" />
              <p className="text-xs font-bold text-destructive">Temporarily Locked</p>
              <p className="text-[11px] text-muted-foreground">
                Maximum 3 failed attempts
              </p>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-destructive/20 text-destructive text-xs font-mono font-bold border border-destructive/30">
                <span>⏱️ Try again in:</span>
                <span className="text-sm font-extrabold">{timeLeftStr || '05:00'}</span>
              </div>
              <button
                type="button"
                onClick={resetAttempts}
                className="text-[11px] font-semibold text-primary underline hover:text-primary/80 pt-1 block mx-auto cursor-pointer"
              >
                Reset attempts (Dev Override)
              </button>
            </div>
          )}

          {/* STEP 1: CREDENTIALS FORM */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              {/* Email Input with Hover Animation */}
              <div className="space-y-1 group">
                <label className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors duration-200">Email</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-muted-foreground group-hover:text-primary transition-colors duration-200">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@barangay178.gov.ph"
                    disabled={isLockedOut || loading}
                    required
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background/50 text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary hover:border-primary/60 hover:shadow-md hover:shadow-primary/10 transition-all duration-300 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password Input with Hover Animation */}
              <div className="space-y-1 group">
                <label className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors duration-200">Password</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-muted-foreground group-hover:text-primary transition-colors duration-200">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={isLockedOut || loading}
                    required
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background/50 text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary hover:border-primary/60 hover:shadow-md hover:shadow-primary/10 transition-all duration-300 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Password Attempts Notice */}
              {attemptsLeft !== null && attemptsLeft > 0 && (
                <p className="text-[11px] text-amber-500 font-semibold">
                  ⚠️ Caution: {attemptsLeft} password attempt{attemptsLeft === 1 ? '' : 's'} remaining.
                </p>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLockedOut || loading}
                className="w-full h-11 mt-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold shadow-lg shadow-primary/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <span>Login</span>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: ENTER CODE (OTP) FORM */}
          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-5 animate-fade-in">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Security Code Sent
                  </p>
                  {otpTimeLeftStr && (
                    <span className={`flex items-center gap-1 font-mono font-bold text-[11px] px-2 py-0.5 rounded-full border ${
                      otpTimeLeftStr <= '01:00'
                        ? 'text-destructive border-destructive/40 bg-destructive/10'
                        : 'text-amber-500 border-amber-500/40 bg-amber-500/10'
                    }`}>
                      ⏱️ {otpTimeLeftStr}
                    </span>
                  )}
                </div>
              </div>

              {/* 6-Digit OTP Code Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">Enter Code</label>
                  <span className="text-[11px] text-amber-500 font-medium">
                    Attempt {otpAttempts + 1} of 3
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-muted-foreground">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP code"
                    disabled={loading}
                    autoFocus
                    required
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-input bg-background/50 text-foreground text-center tracking-[0.4em] font-mono text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                  />
                </div>
              </div>

              {/* Action Buttons: Verify & Back / Cancel */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={loading || otpCode.length < 4}
                  className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold shadow-lg shadow-primary/25 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <span>Verify Code & Login</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBackToCredentials}
                  disabled={loading}
                  className="w-full h-10 rounded-xl border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back / Cancel</span>
                </button>
              </div>
            </form>
          )}

          {/* Footer Branding */}
          <div className="mt-8 pt-4 border-t border-border text-center">
            <p className="text-[11px] text-muted-foreground">
              Barangay 178 Emergency Communication System &copy; 2026
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
