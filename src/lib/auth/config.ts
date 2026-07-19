import { apiKeyWithDefaults } from '@delmaredigital/payload-better-auth'
import { admin, bearer } from 'better-auth/plugins'
import type { BetterAuthOptions } from 'better-auth'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

function generateAppleClientSecret(): string {
  const clientId = process.env.APPLE_CLIENT_ID
  const teamId = process.env.APPLE_TEAM_ID
  const keyId = process.env.APPLE_KEY_ID
  const p8Path = process.env.APPLE_P8_PATH || path.resolve(process.cwd(), 'AuthKey.p8')

  if (!clientId || !teamId || !keyId || !fs.existsSync(p8Path)) {
    console.warn(
      'Apple Sign In: missing APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID, or AuthKey.p8 — falling back to APPLE_CLIENT_SECRET env var',
    )
    return process.env.APPLE_CLIENT_SECRET || ''
  }

  const privateKey = fs.readFileSync(p8Path, 'utf8')

  const header = Buffer.from(
    JSON.stringify({ alg: 'ES256', kid: keyId }),
  ).toString('base64url')

  const now = Math.floor(Date.now() / 1000)
  const payload = Buffer.from(
    JSON.stringify({
      iss: teamId,
      iat: now,
      exp: now + 86400 * 150,
      aud: 'https://appleid.apple.com',
      sub: clientId,
    }),
  ).toString('base64url')

  const signature = crypto
    .sign('sha256', Buffer.from(`${header}.${payload}`), privateKey)
    .toString('base64url')

  return `${header}.${payload}.${signature}`
}

export const betterAuthOptions: Partial<BetterAuthOptions> = {
  appName: 'Afno Payload',
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'user' },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
  },
  socialProviders: {
    google: {
      enabled: true,
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
    apple: {
      enabled: true,
      clientId: process.env.APPLE_CLIENT_ID || '',
      clientSecret: generateAppleClientSecret(),
    },
  },
  plugins: [
    apiKeyWithDefaults(), // Use this instead of apiKey() for better admin UI support
    admin(),
    bearer(),
  ],
}
