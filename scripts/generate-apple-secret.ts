import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const CLIENT_ID = process.env.APPLE_CLIENT_ID
const TEAM_ID = process.env.APPLE_TEAM_ID
const KEY_ID = process.env.APPLE_KEY_ID
const P8_PATH = process.env.APPLE_P8_PATH || path.resolve(process.cwd(), 'AuthKey.p8')

if (!CLIENT_ID || !TEAM_ID || !KEY_ID) {
  console.error('Missing required env vars: APPLE_CLIENT_ID, APPLE_TEAM_ID, APPLE_KEY_ID')
  process.exit(1)
}

if (!fs.existsSync(P8_PATH)) {
  console.error(`P8 key not found at: ${P8_PATH}`)
  process.exit(1)
}

const privateKey = fs.readFileSync(P8_PATH, 'utf8')

const header = Buffer.from(
  JSON.stringify({ alg: 'ES256', kid: KEY_ID }),
).toString('base64url')

const now = Math.floor(Date.now() / 1000)
const payload = Buffer.from(
  JSON.stringify({
    iss: TEAM_ID,
    iat: now,
    exp: now + 86400 * 150,
    aud: 'https://appleid.apple.com',
    sub: CLIENT_ID,
  }),
).toString('base64url')

const signature = crypto.sign(
  'sha256',
  Buffer.from(`${header}.${payload}`),
  privateKey,
).toString('base64url')

const clientSecret = `${header}.${payload}.${signature}`

console.log(clientSecret)
