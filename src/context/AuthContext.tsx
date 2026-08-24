import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/services/supabase'
import { sendLoginOtpEmail } from '@/services/resendService'

interface AuthContextType {
  user: User | null
  session: Session | null
  adminEmail: string
  activeOtpCode: string | null
  updateAdminEmail: (newEmail: string) => Promise<{ success: boolean; error?: string }>
  validateCredentials: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  loading: boolean
  isAuthenticated: boolean
  failedAttempts: number
  isLockedOut: boolean
  lockoutUntil: number | null
  resetAttempts: () => void
  recordFailedAttempt: () => number
  sendOtpCode: (email: string) => Promise<{ success: boolean; error?: string; generatedCode?: string }>
  verifyOtpCode: (email: string, token: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const MAX_FAILED_ATTEMPTS = 3

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeOtpCode, setActiveOtpCode] = useState<string | null>(null)
  
  // Dynamic Admin Email (editable in Settings, stored in localStorage/session)
  const [adminEmail, setAdminEmail] = useState<string>(() => {
    return localStorage.getItem('barangay_admin_email') || 'admin@barangay178.gov.ph'
  })

  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    const saved = localStorage.getItem('admin_login_failed_attempts')
    return saved ? parseInt(saved, 10) : 0
  })

  const [lockoutUntil, setLockoutUntil] = useState<number | null>(() => {
    const saved = localStorage.getItem('admin_login_lockout_until')
    return saved ? parseInt(saved, 10) : null
  })

  const [isLockedOut, setIsLockedOut] = useState<boolean>(() => {
    const savedUntil = localStorage.getItem('admin_login_lockout_until')
    if (savedUntil) {
      const until = parseInt(savedUntil, 10)
      if (Date.now() < until) return true
    }
    const saved = localStorage.getItem('admin_login_locked_out')
    return saved === 'true'
  })

  // Dev / Demo authenticated flag in case Supabase auth session is maintained locally
  const [isDemoAuth, setIsDemoAuth] = useState<boolean>(() => {
    return localStorage.getItem('admin_demo_auth') === 'true'
  })

  // Periodically check if lockout timer has expired
  useEffect(() => {
    const interval = setInterval(() => {
      if (lockoutUntil) {
        if (Date.now() >= lockoutUntil) {
          resetAttempts()
        }
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lockoutUntil])

  useEffect(() => {
    // Get initial session from Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user?.email) {
        setAdminEmail(session.user.email)
        localStorage.setItem('barangay_admin_email', session.user.email)
      }
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    // Listen for Auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user?.email) {
        setAdminEmail(session.user.email)
        localStorage.setItem('barangay_admin_email', session.user.email)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const updateAdminEmail = async (newEmail: string): Promise<{ success: boolean; error?: string }> => {
    const clean = newEmail.trim().toLowerCase()
    if (!clean || !clean.includes('@')) {
      return { success: false, error: 'Please enter a valid email address.' }
    }
    setAdminEmail(clean)
    localStorage.setItem('barangay_admin_email', clean)
    try {
      await supabase.auth.updateUser({ email: clean })
    } catch (err: any) {
      console.warn('Supabase email update notice:', err?.message)
    }
    return { success: true }
  }

  const recordFailedAttempt = () => {
    const next = failedAttempts + 1
    setFailedAttempts(next)
    localStorage.setItem('admin_login_failed_attempts', next.toString())
    if (next >= MAX_FAILED_ATTEMPTS) {
      const until = Date.now() + 5 * 60 * 1000 // 5 minutes lockout (300,000ms)
      setLockoutUntil(until)
      setIsLockedOut(true)
      localStorage.setItem('admin_login_lockout_until', until.toString())
      localStorage.setItem('admin_login_locked_out', 'true')
    }
    return MAX_FAILED_ATTEMPTS - next
  }

  const resetAttempts = () => {
    setFailedAttempts(0)
    setIsLockedOut(false)
    setLockoutUntil(null)
    localStorage.removeItem('admin_login_failed_attempts')
    localStorage.removeItem('admin_login_locked_out')
    localStorage.removeItem('admin_login_lockout_until')
  }

  const sendOtpCode = async (email: string): Promise<{ success: boolean; error?: string; generatedCode?: string }> => {
    // Generate real random 6-digit OTP code
    const generated = Math.floor(100000 + Math.random() * 900000).toString()
    setActiveOtpCode(generated)

    // Dispatch real email via Resend API
    const emailResult = await sendLoginOtpEmail(email, generated)

    // Also trigger Supabase OTP as background backup
    supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    }).catch(() => {})

    if (!emailResult.success) {
      console.warn('Email delivery failed:', emailResult.error, emailResult.errorDetail)
      return {
        success: true,
        generatedCode: generated,
        error: `Email delivery issue: ${emailResult.error}.`,
      }
    }

    return { success: true, generatedCode: generated }
  }

  const verifyOtpCode = async (email: string, token: string): Promise<{ success: boolean; error?: string }> => {
    const cleanToken = token.trim()

    // Verify against the generated Resend OTP code stored in memory
    if (cleanToken === activeOtpCode) {
      setIsDemoAuth(true)
      localStorage.setItem('admin_demo_auth', 'true')
      resetAttempts()
      return { success: true }
    }

    // Also check Supabase Auth verifyOtp (backup if Supabase SMTP is active)
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: cleanToken,
        type: 'email',
      })

      if (!error && data?.session) {
        setSession(data.session)
        setUser(data.user)
        setIsDemoAuth(true)
        localStorage.setItem('admin_demo_auth', 'true')
        resetAttempts()
        return { success: true }
      }
    } catch {
      // ignore
    }

    return { success: false, error: 'Invalid or expired verification code.' }
  }

  const validateCredentials = async (inputEmail: string, inputPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // 1. Check server-side verification endpoint
      const res = await fetch('/api/verify-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inputEmail, password: inputPassword }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.valid) {
          return { success: true }
        }
      }
    } catch {
      // Network/local fallback
    }

    // 2. Check Supabase Auth
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: inputEmail,
        password: inputPassword,
      })
      if (!error) {
        return { success: true }
      }
    } catch {
      // ignore
    }

    return { success: false, error: 'Invalid email or password.' }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Error signing out:', err)
    } finally {
      setSession(null)
      setUser(null)
      setIsDemoAuth(false)
      localStorage.removeItem('admin_demo_auth')
    }
  }

  const isAuthenticated = !!session || isDemoAuth

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        adminEmail,
        activeOtpCode,
        updateAdminEmail,
        validateCredentials,
        loading,
        isAuthenticated,
        failedAttempts,
        isLockedOut,
        lockoutUntil,
        resetAttempts,
        recordFailedAttempt,
        sendOtpCode,
        verifyOtpCode,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
