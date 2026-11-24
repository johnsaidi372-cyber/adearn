// KYC provider adapter (Persona). Sandbox/test credentials are expected here.
// Without credentials, endpoints return a clear "not configured" response.
const crypto = require('crypto')
const API_KEY = process.env.KYC_API_KEY
const TEMPLATE_ID = process.env.KYC_TEMPLATE_ID
const WEBHOOK_SECRET = process.env.KYC_WEBHOOK_SECRET
const BASE = process.env.KYC_BASE_URL || 'https://api.withpersona.com/api/v1'

function configured() {
  return Boolean(API_KEY && TEMPLATE_ID && WEBHOOK_SECRET)
}

async function startVerification(userId, email) {
  if (!configured()) throw new Error('KYC provider is not configured on this server.')
  const response = await fetch(`${BASE}/inquiries`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'Persona-Version': '2023-01-05',
    },
    body: JSON.stringify({
      data: {
        attributes: {
          template_id: TEMPLATE_ID,
          reference_id: userId,
          fields: { email },
        },
      },
    }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.errors?.[0]?.detail || 'Could not start identity verification.')
  return { url: data.data?.attributes?.url || null, inquiryId: data.data?.id || null }
}

function verifyWebhook(headers, rawBody) {
  if (!WEBHOOK_SECRET) return false
  const signature = headers['persona-signature'] || ''
  const match = /t=(\d+),v1=([a-f0-9]+)/i.exec(signature)
  if (!match) return false
  const expected = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(`${match[1]}.${rawBody.toString('utf8')}`)
    .digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(match[2].toLowerCase())
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

module.exports = { configured, startVerification, verifyWebhook }
