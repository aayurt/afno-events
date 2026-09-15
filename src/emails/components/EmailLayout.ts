/**
 * Layout and base wrapper for all Afno Events transactional emails.
 * High deliverability, tested across Apple Mail, Gmail, and Outlook.
 */

export interface BaseEmailOptions {
  title: string
  previewText?: string
  contentHtml: string
}

export function renderEmailLayout({ title, previewText, contentHtml }: BaseEmailOptions): string {
  const currentYear = new Date().getFullYear()

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
    }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    td { padding: 0; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    .content-card {
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .btn-primary {
      display: inline-block;
      background-color: #e11d48;
      color: #ffffff !important;
      font-weight: 700;
      font-size: 14px;
      padding: 14px 28px;
      border-radius: 12px;
      text-decoration: none;
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-radius: 9999px;
    }
  </style>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f8fafc;">
  ${previewText ? `<div style="display: none; max-height: 0px; overflow: hidden;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}

  <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center">
        <!-- Main Wrapper (Max Width 600px) -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 580px; margin: 0 auto;">
          
          <!-- Brand Header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <a href="https://afnoevents.co.uk" target="_blank" style="text-decoration: none; display: inline-flex; align-items: center; gap: 8px;">
                <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                  <tr>
                    <td style="width: 32px; height: 32px; background-color: #e11d48; border-radius: 10px; text-align: center; vertical-align: middle; color: #ffffff; font-weight: 900; font-size: 16px;">
                      A
                    </td>
                    <td style="padding-left: 10px; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">
                      Afno Events
                    </td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>

          <!-- Card Body -->
          <tr>
            <td class="content-card" style="padding: 36px 32px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 16px 0; text-align: center; font-size: 12px; color: #64748b; line-height: 1.6;">
              <p style="margin: 0 0 8px;">
                Afno Events UK &bull; The Home for UK Nepalese Community Events
              </p>
              <p style="margin: 0 0 12px;">
                <a href="https://afnoevents.co.uk/privacy" style="color: #64748b; text-decoration: underline;">Privacy Policy</a> &bull;
                <a href="https://afnoevents.co.uk/terms" style="color: #64748b; text-decoration: underline;">Terms of Service</a> &bull;
                <a href="mailto:support@afnoevents.co.uk" style="color: #64748b; text-decoration: underline;">Support</a>
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                &copy; ${currentYear} Afno Events. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}
