import { renderEmailLayout } from '../components/EmailLayout'

export interface PasswordResetProps {
  userName?: string
  resetUrl: string
}

export function renderPasswordResetHtml({ userName, resetUrl }: PasswordResetProps): string {
  const greeting = userName ? `Hello ${userName},` : 'Hello,'

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge" style="background-color: #f1f5f9; color: #475569; padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 11px;">
        SECURITY &bull; PASSWORD RESET
      </span>
      <h1 style="margin: 16px 0 8px; font-size: 26px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">
        Reset Your Password
      </h1>
      <p style="margin: 0; color: #64748b; font-size: 15px;">
        ${greeting} We received a request to reset the password for your Afno Events account. Click below to choose a new password.
      </p>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${resetUrl}" class="btn-primary" style="display: inline-block; background-color: #0f172a; color: #ffffff !important; font-weight: 700; font-size: 15px; padding: 16px 36px; border-radius: 14px; text-decoration: none; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);">
        Reset My Password &rarr;
      </a>
    </div>

    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 13px; color: #64748b; line-height: 1.5;">
      <p style="margin: 0 0 8px;">Or copy and paste this reset URL into your browser:</p>
      <p style="margin: 0; word-break: break-all; color: #0284c7;">
        <a href="${resetUrl}" style="color: #0284c7; text-decoration: underline;">${resetUrl}</a>
      </p>
    </div>

    <div style="margin-top: 24px; padding: 12px 16px; background-color: #fff1f2; border: 1px solid #ffe4e6; border-radius: 10px; font-size: 12px; color: #e11d48; line-height: 1.4;">
      <strong>Security notice:</strong> This link expires in 1 hour. If you didn't request a password reset, your account is safe and no action is needed.
    </div>
  `

  return renderEmailLayout({
    title: 'Reset your Afno Events password',
    previewText: 'Click here to reset your Afno Events account password.',
    contentHtml: content,
  })
}
