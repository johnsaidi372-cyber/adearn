// PayPal Payouts adapter. Sandbox only in this build.
// Credentials are read from the environment; they are never stored in the repository.
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID
const SECRET = process.env.PAYPAL_SECRET
const WEBHOOK_ID = process.env.PAYPAL_WEBHOOK_ID
const MODE = process.env.PAYPAL_MODE || 'sandbox'

function baseUrl() {
  if (MODE !== 'sandbox') {
    throw new Error('Live PayPal payouts are disabled. Complete compliance sign-off before enabling them.')
  }
  return 'https://api-m.sandbox.paypal.com'
}

function configured() {
  return Boolean(CLIENT_ID && SECRET && WEBHOOK_ID)
}

async function accessToken() {
  if (!configured()) throw new Error('PayPal payouts are not configured on this server.')
  const response = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error_description || 'Could not authenticate with PayPal.')
  return data.access_token
}

async function createPayout({ payoutId, amountUsd, email, note }) {
  const token = await accessToken()
  const response = await fetch(`${baseUrl()}/v1/payments/payouts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': payoutId,
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: payoutId,
        email_subject: 'You have a payment from AdEarn',
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: { value: amountUsd.toFixed(2), currency: 'USD' },
          receiver: email,
          note: note || 'AdEarn earnings',
          supplementary_data: { related_ids: { order_id: payoutId } },
        },
      ],
    }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'PayPal rejected the payout request.')
  return data
}

async function verifyWebhook(headers, rawBody) {
  if (!configured()) return false
  const token = await accessToken()
  let event
  try {
    event = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return false
  }
  const response = await fetch(`${baseUrl()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transmission_id: headers['paypal-transmission-id'],
      transmission_time: headers['paypal-transmission-time'],
      cert_url: headers['paypal-cert-url'],
      auth_algo: headers['paypal-auth-algo'],
      transmission_sig: headers['paypal-transmission-sig'],
      webhook_id: WEBHOOK_ID,
      webhook_event: event,
    }),
  })
  const data = await response.json()
  return response.ok && data.verification_status === 'SUCCESS'
}

module.exports = { configured, createPayout, verifyWebhook, MODE }
