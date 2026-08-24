/**
 * Resend Email Service
 * Sends official 2-Step Login OTP codes and Email Verification emails via Resend API.
 * Uses Vite dev proxy (/api/resend) to avoid browser CORS restrictions.
 */

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export interface ResendResult {
  success: boolean
  error?: string
  errorDetail?: string
}

export async function sendResendEmail({ to, subject, html }: SendEmailParams): Promise<ResendResult> {
  try {
    const response = await fetch('/api/resend', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Barangay 178 Admin <onboarding@resend.dev>',
        to: [to],
        subject,
        html,
      }),
    })

    let data: any = {}
    try {
      data = await response.json()
    } catch {
      data = {}
    }

    if (!response.ok) {
      const errMsg = data?.message || data?.error?.message || data?.name || `HTTP ${response.status}`
      console.error('Resend API Error:', response.status, data)
      return {
        success: false,
        error: errMsg,
        errorDetail: JSON.stringify(data),
      }
    }

    console.log('Resend email dispatched successfully:', data)
    return { success: true }
  } catch (err: any) {
    console.error('Network error dispatching email via Resend:', err)
    return { success: false, error: err.message || 'Network error sending email.' }
  }
}

/**
 * Send official Admin Login 2-Step OTP Code email
 */
export async function sendLoginOtpEmail(toEmail: string, otpCode: string): Promise<ResendResult> {
  const subject = `${otpCode} - Your Barangay 178 Admin Security Code`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #2E8B47; margin: 0; font-size: 22px;">BARANGAY 178</h2>
        <p style="font-size: 12px; color: #64748b; margin-top: 4px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">Emergency Communication System</p>
      </div>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
      <p style="font-size: 14px; color: #334155; margin-bottom: 12px;">Hello Administrator,</p>
      <p style="font-size: 14px; color: #334155; line-height: 1.5;">You are attempting to log into the <strong>Barangay 178 Admin Portal</strong>. Use the 6-digit security code below to complete login:</p>
      <div style="text-align: center; margin: 24px 0;">
        <div style="display: inline-block; padding: 16px 32px; background-color: #f0fdf4; border: 2px dashed #2E8B47; border-radius: 12px; font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #166534; font-family: monospace;">
          ${otpCode}
        </div>
      </div>
      <p style="font-size: 12px; color: #64748b; text-align: center; margin-bottom: 20px;">
        This security code is valid for 10 minutes. Do not share this code with anyone.
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
        Barangay 178, Camarin, Caloocan City &copy; 2026 Emergency Portal
      </p>
    </div>
  `
  return sendResendEmail({ to: toEmail, subject, html })
}

/**
 * Send official Email Change Verification Code email
 */
export async function sendEmailChangeOtp(newEmail: string, verificationCode: string): Promise<ResendResult> {
  const subject = `${verificationCode} - Verify Your New Barangay 178 Admin Email`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #2E8B47; margin: 0; font-size: 22px;">BARANGAY 178</h2>
        <p style="font-size: 12px; color: #64748b; margin-top: 4px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">Admin Email Change Verification</p>
      </div>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
      <p style="font-size: 14px; color: #334155; margin-bottom: 12px;">Hello Administrator,</p>
      <p style="font-size: 14px; color: #334155; line-height: 1.5;">You requested to change your Admin Email to <strong>${newEmail}</strong>. Enter the verification code below in the Settings page to confirm:</p>
      <div style="text-align: center; margin: 24px 0;">
        <div style="display: inline-block; padding: 16px 32px; background-color: #eff6ff; border: 2px dashed #2563eb; border-radius: 12px; font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #1e40af; font-family: monospace;">
          ${verificationCode}
        </div>
      </div>
      <p style="font-size: 12px; color: #64748b; text-align: center; margin-bottom: 20px;">
        If you did not request this email change, please ignore this email.
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
      <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">
        Barangay 178, Camarin, Caloocan City &copy; 2026 Emergency Portal
      </p>
    </div>
  `
  return sendResendEmail({ to: newEmail, subject, html })
}
