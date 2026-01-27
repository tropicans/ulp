/**
 * Email Service using Resend
 * Docs: https://resend.com/docs
 */

interface EmailOptions {
    to: string
    subject: string
    html: string
    from?: string
}

interface EmailResult {
    success: boolean
    messageId?: string
    error?: string
}

/**
 * Send email via Resend API
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
    const apiKey = process.env.RESEND_API_KEY
    const defaultFrom = process.env.EMAIL_FROM || "noreply@TITAN.go.id"

    if (!apiKey) {
        console.error("RESEND_API_KEY not configured")
        return { success: false, error: "Email service not configured" }
    }

    try {
        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: options.from || defaultFrom,
                to: options.to,
                subject: options.subject,
                html: options.html,
            }),
        })

        const data = await response.json()

        if (!response.ok) {
            console.error("Resend API error:", data)
            return { success: false, error: data.message || "Failed to send email" }
        }

        return { success: true, messageId: data.id }
    } catch (error) {
        console.error("Email send error:", error)
        return { success: false, error: "Failed to send email" }
    }
}

// ============================================
// Email Templates
// ============================================

export const EmailTemplates = {
    verificationOTP: (data: {
        userName: string
        otp: string
        expiresIn: string
    }) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Kode Verifikasi Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #3b82f6; font-size: 28px; margin: 0;">TITAN</h1>
                <p style="color: #64748b; margin: 8px 0 0 0;">Learning Experience Platform</p>
            </div>
            
            <h2 style="color: #1e293b; font-size: 20px; margin-bottom: 16px;">
                Halo ${data.userName}! 👋
            </h2>
            
            <p style="color: #475569; line-height: 1.6; margin-bottom: 24px;">
                Berikut adalah kode verifikasi untuk mengaktifkan akun Anda:
            </p>
            
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="margin: 0 0 8px 0; color: rgba(255,255,255,0.8); font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Kode Verifikasi</p>
                <p style="margin: 0; color: white; font-size: 36px; font-weight: bold; letter-spacing: 8px;">${data.otp}</p>
            </div>
            
            <p style="color: #64748b; font-size: 14px; text-align: center; margin-bottom: 32px;">
                ⏰ Kode berlaku selama <strong>${data.expiresIn}</strong>
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
                Jika Anda tidak mendaftar di TITAN, abaikan email ini.<br>
                © 2026 Sekretariat Negara RI
            </p>
        </div>
    </div>
</body>
</html>
`,

    verificationSuccess: (data: {
        userName: string
    }) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Terverifikasi</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <div style="text-align: center;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
                    <span style="color: white; font-size: 40px;">✓</span>
                </div>
                
                <h1 style="color: #1e293b; font-size: 24px; margin: 0 0 16px 0;">
                    Email Terverifikasi! 🎉
                </h1>
                
                <p style="color: #475569; line-height: 1.6; margin-bottom: 24px;">
                    Halo ${data.userName}, akun Anda sudah terverifikasi.<br>
                    Sekarang Anda dapat mengakses semua fitur TITAN.
                </p>
                
                <a href="${process.env.AUTH_URL || 'http://localhost:3001'}/login" 
                   style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                    Masuk ke TITAN
                </a>
            </div>
        </div>
    </div>
</body>
</html>
`,
}
