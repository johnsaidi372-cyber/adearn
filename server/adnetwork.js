// Rewarded-ad network adapter.
// "demo" (default) keeps the local catalog and client-side timer.
// Any other provider switches to server-side verification: the ad network posts a
// signed callback, and only that callback can credit the ledger.
const crypto = require('crypto')

const PROVIDER = process.env.AD_NETWORK_PROVIDER || 'demo'
const SECRET = process.env.AD_NETWORK_SECRET || ''

function mode() {
  return PROVIDER === 'demo' ? 'demo' : 'server'
}

function configured() {
  return PROVIDER !== 'demo' && Boolean(SECRET)
}

function info() {
  return { provider: PROVIDER, mode: mode(), configured: configured() }
}

function canonical(payload) {
  return [payload.sessionId, payload.transactionId, payload.rewardAmount, payload.timestamp].join('|')
}

function verify(payload, signature) {
  if (!SECRET) return false
  const expected = crypto.createHmac('sha256', SECRET).update(canonical(payload)).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(String(signature || ''))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

module.exports = { mode, configured, info, verify }
