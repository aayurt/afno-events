import { renderEmailLayout } from '../components/EmailLayout'

export interface VerifyEmailProps {
  userName?: string
  verifyUrl: string
}

export function renderVerifyEmailHtml({ userName, verifyUrl }: VerifyEmailProps): string {
  const greeting = userName ? `Hello ${userName},` : 'Hello,'

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge" style="background-color: #ffe4e6; color: #e11d48; padding: 4px 12px; border-radius: 9999px; font-weight: 700; font-size: 11px;">
        CONFIRM YOUR ACCOUNT
      </span>
      <h1 style="margin: 16px 0 8px; font-size: 26px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">
        Welcome to Afno Events!
      </h1>
      <p style="margin: 0; color: #64748b; font-size: 15px;">
        Verify your email address to access your tickets, save favorite events, and connect with your community.
      </p>
    </div>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${verifyUrl}" class="btn-primary" style="display: inline-block; background-color: #e11d48; color: #ffffff !important; font-weight: 700; font-size: 15px; padding: 16px 36px; border-radius: 14px; text-decoration: none; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.25);">
        Verify Email Address &rarr;
      </a>
    </div>

    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 13px; color: #64748b; line-height: 1.5;">
      <p style="margin: 0 0 8px;">Or copy and paste this verification link into your browser:</p>
      <p style="margin: 0; word-break: break-all; color: #0284c7;">
        <a href="${verifyUrl}" style="color: #0284c7; text-decoration: underline;">${verifyUrl}</a>
      </p>
    </div>

    <div style="margin-top: 24px; padding: 12px 16px; background-color: #f8fafc; border-radius: 10px; font-size: 12px; color: #94a3b8;">
      If you didn't create an account with Afno Events, you can safely ignore this email.
    </div>
  `

  return renderEmailLayout({
    title: 'Verify your Afno Events email address',
    previewText: 'Verify your email to access your tickets and community events.',
    contentHtml: content,
  })
}
