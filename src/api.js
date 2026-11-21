const BASE = '/api'

let token = localStorage.getItem('adearn_token')

export function setToken(value) {
  token = value
  if (value) localStorage.setItem('adearn_token', value)
  else localStorage.removeItem('adearn_token')
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })

  let data
  try {
    data = await response.json()
  } catch {
    data = {}
  }
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
  return data
}

export const api = {
  health: () => request('/health'),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => request('/me'),
  listAds: () => request('/ads'),
  startAd: (adId) => request('/ads/start', { method: 'POST', body: JSON.stringify({ adId }) }),
  completeAd: (sessionId) =>
    request('/ads/complete', { method: 'POST', body: JSON.stringify({ sessionId }) }),
  transactions: () => request('/transactions'),
  withdrawals: () => request('/withdrawals'),
  requestWithdrawal: (payload) =>
    request('/withdrawals', { method: 'POST', body: JSON.stringify(payload) }),
}
