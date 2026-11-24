const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const { read, write, ensure, uid, hashPassword, makeSalt } = require('./db')
const ledger = require('./ledger')
const paypal = require('./paypal')
const postgres = require('./postgres')

ensure()

const app = express()
app.use(cors())
// PayPal signs the raw request body; register this route before the JSON parser.
app.use('/api/webhooks/paypal', express.raw({ type: '*/*' }))
app.use(express.json())

const USD_PER_COIN = 0.01
const MIN_WITHDRAWAL_USD = 10
// Where ad clicks land. JForce is Jumia's affiliate portal for Kenya.
const AFFILIATE_URL = 'https://jforce.jumia.co.ke/affiliate'
// One-time account verification fee, charged only on a user's first withdrawal.
// It is deducted from their own coin balance — users never pay out-of-pocket.
const VERIFICATION_FEE_USD = 3
const VERIFICATION_FEE_COINS = Math.round(VERIFICATION_FEE_USD / USD_PER_COIN)

// Demo ad catalog. In a real product this would come from an ad network SDK/API.
const ADS = [
  {
    id: 'jumia',
    brand: 'Jumia',
    category: 'E-commerce',
    title: 'Everything you need, one marketplace.',
    body: 'Millions of products at unbeatable prices, delivered to your door. Discover why millions of shoppers choose Jumia every day.',
    perks: ['Deals up to 80% off', 'Free delivery on select items', 'Pay on delivery'],
    cta: 'Shop the deals',
    reward: 28,
    duration: 13,
    gradient: 'from-orange-500 via-amber-500 to-yellow-400',
    glyph: 'J',
  },
  {
    id: 'jumia-mall',
    brand: 'Jumia Mall',
    category: 'Online Shopping',
    title: 'Genuine brands. Better prices.',
    body: 'Shop official stores and verified products with warranties you can trust. Quality you know, prices you will love.',
    perks: ['100% genuine products', 'Official brand stores', 'Easy returns'],
    cta: 'Explore the mall',
    reward: 24,
    duration: 12,
    gradient: 'from-amber-500 via-orange-600 to-orange-700',
    glyph: 'M',
  },
  {
    id: 'jumia-food',
    brand: 'Jumia Food',
    category: 'Food Delivery',
    title: 'Your favourites, delivered hot.',
    body: 'From local dishes to international cuisine — order from thousands of restaurants and get it delivered in minutes.',
    perks: ['1,000s of restaurants', 'Live order tracking', 'First order discount'],
    cta: 'Order a meal',
    reward: 16,
    duration: 9,
    gradient: 'from-orange-400 via-red-500 to-rose-600',
    glyph: 'F',
  },
  {
    id: 'nova',
    brand: 'NovaStream',
    category: 'Entertainment',
    title: 'Every story, one subscription.',
    body: 'Thousands of films, series and live channels. Watch anything, anywhere, on any device.',
    perks: ['Ad-free streaming', '4K on all plans', 'Cancel anytime'],
    cta: 'Start free trial',
    reward: 25,
    duration: 12,
    gradient: 'from-indigo-600 via-violet-600 to-fuchsia-600',
    glyph: 'N',
  },
  {
    id: 'pulsefit',
    brand: 'PulseFit',
    category: 'Health & Fitness',
    title: 'Your strongest self starts today.',
    body: 'Personalized workouts, meal plans and coaching that adapts to your goals every week.',
    perks: ['200+ guided workouts', 'Custom nutrition plans', 'Progress tracking'],
    cta: 'Get the app',
    reward: 18,
    duration: 10,
    gradient: 'from-emerald-500 via-teal-500 to-cyan-600',
    glyph: 'P',
  },
  {
    id: 'greenbite',
    brand: 'GreenBite',
    category: 'Food Delivery',
    title: 'Good food, zero guilt.',
    body: 'Fresh, chef-made meals delivered in 30 minutes. Your first order is on us.',
    perks: ['30-min delivery', 'Farm-fresh ingredients', 'Free first order'],
    cta: 'Order now',
    reward: 14,
    duration: 8,
    gradient: 'from-lime-500 via-green-500 to-emerald-600',
    glyph: 'G',
  },
  {
    id: 'orbit',
    brand: 'Orbit Bank',
    category: 'Finance',
    title: 'Banking that moves with you.',
    body: 'No hidden fees, instant transfers and 4.5% APY on every dollar you save.',
    perks: ['0 monthly fees', '4.5% APY', 'Instant transfers'],
    cta: 'Open an account',
    reward: 30,
    duration: 15,
    gradient: 'from-sky-600 via-blue-600 to-indigo-700',
    glyph: 'O',
  },
  {
    id: 'luma',
    brand: 'LumaPhone X',
    category: 'Technology',
    title: 'See everything in a new light.',
    body: 'A stunning edge-to-edge display, all-day battery and a camera that rivals the pros.',
    perks: ['200MP camera', '36-hour battery', '7-year updates'],
    cta: 'Explore the phone',
    reward: 20,
    duration: 11,
    gradient: 'from-slate-700 via-slate-900 to-indigo-900',
    glyph: 'L',
  },
  {
    id: 'wanderly',
    brand: 'Wanderly',
    category: 'Travel',
    title: 'Go somewhere unforgettable.',
    body: 'Handpicked stays and experiences in 90 countries. Your next adventure is one tap away.',
    perks: ['90 destinations', 'Best-price guarantee', 'Free cancellation'],
    cta: 'Find your trip',
    reward: 22,
    duration: 12,
    gradient: 'from-orange-500 via-rose-500 to-pink-600',
    glyph: 'W',
  },
]

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    coins: user.coins,
    createdAt: user.createdAt,
    verificationFeePaid: !!user.verificationFeePaid,
    role: user.role || 'user',
    kycStatus: user.kycStatus || 'none',
  }
}

function statsFor(db, userId) {
  const earns = db.transactions.filter((t) => t.userId === userId && t.type === 'earn')
  return {
    totalEarnedCoins: earns.reduce((sum, t) => sum + t.coins, 0),
    adsWatched: db.adSessions.filter((s) => s.userId === userId && s.completed).length,
    withdrawals: db.withdrawals.filter((w) => w.userId === userId).length,
  }
}

function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  const db = read()
  const user = db.users.find((u) => u.token === token)
  if (!user) return res.status(401).json({ error: 'Please sign in to continue.' })
  req.user = user
  req.db = db
  next()
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required.' })
  next()
}

function activityFor(db, userId) {
  return {
    transactions: db.transactions.filter((t) => t.userId === userId),
    withdrawals: db.withdrawals.filter((w) => w.userId === userId),
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString() }))

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body || {}
  if (!name || !email || !password || String(password).length < 6) {
    return res.status(400).json({ error: 'Enter a name, email and a password of at least 6 characters.' })
  }
  const db = read()
  const normalized = String(email).trim().toLowerCase()
  if (db.users.some((u) => u.email === normalized)) {
    return res.status(409).json({ error: 'That email is already registered. Try logging in.' })
  }
  const salt = makeSalt()
  const user = {
    id: uid('u'),
    name: String(name).trim(),
    email: normalized,
    salt,
    passwordHash: hashPassword(password, salt),
    coins: 50,
    token: uid('t'),
    createdAt: new Date().toISOString(),
    verificationFeePaid: false,
    kycStatus: 'none',
  }
  db.users.push(user)
  ledger.apply(db, user.id, 50, 'bonus', user.id, 'Welcome bonus')
  db.transactions.unshift({
    id: uid('tx'),
    userId: user.id,
    type: 'earn',
    coins: 50,
    usd: 0.5,
    description: 'Welcome bonus',
    createdAt: user.createdAt,
  })
  write(db)
  res.status(201).json({ token: user.token, user: publicUser(user) })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {}
  const db = read()
  const user = db.users.find((u) => u.email === String(email || '').trim().toLowerCase())
  if (!user || user.passwordHash !== hashPassword(password || '', user.salt)) {
    return res.status(401).json({ error: 'Invalid email or password.' })
  }
  res.json({ token: user.token, user: publicUser(user) })
})

app.get('/api/me', auth, (req, res) => {
  res.json({ user: { ...publicUser(req.user), ...statsFor(req.db, req.user.id) } })
})

app.get('/api/ads', auth, (_req, res) => {
  res.json(
    ADS.map((ad) => ({
      ...ad,
      usd: +(ad.reward * USD_PER_COIN).toFixed(2),
      targetUrl: ad.targetUrl || AFFILIATE_URL,
    }))
  )
})

app.post('/api/ads/start', auth, (req, res) => {
  const ad = ADS.find((a) => a.id === req.body?.adId)
  if (!ad) return res.status(404).json({ error: 'Ad not found.' })
  const session = {
    id: uid('s'),
    userId: req.user.id,
    adId: ad.id,
    startedAt: Date.now(),
    duration: ad.duration,
    completed: false,
  }
  req.db.adSessions.push(session)
  write(req.db)
  res.json({ sessionId: session.id, duration: ad.duration })
})

app.post('/api/ads/complete', auth, (req, res) => {
  const db = req.db
  const session = db.adSessions.find(
    (s) => s.id === req.body?.sessionId && s.userId === req.user.id
  )
  if (!session) return res.status(404).json({ error: 'Ad session not found.' })
  if (session.completed) return res.status(400).json({ error: 'This reward has already been claimed.' })

  const elapsed = (Date.now() - session.startedAt) / 1000
  if (elapsed < session.duration) {
    return res.status(400).json({
      error: `Please watch the full ad — ${Math.ceil(session.duration - elapsed)}s remaining.`,
    })
  }

  const ad = ADS.find((a) => a.id === session.adId)
  session.completed = true
  const user = db.users.find((u) => u.id === req.user.id)
  const newBalance = ledger.apply(db, user.id, ad.reward, 'ad_reward', session.id, `Watched ${ad.brand} ad`)
  user.coins = newBalance
  db.transactions.unshift({
    id: uid('tx'),
    userId: user.id,
    type: 'earn',
    coins: ad.reward,
    usd: +(ad.reward * USD_PER_COIN).toFixed(2),
    description: `Watched ${ad.brand} ad`,
    adId: ad.id,
    createdAt: new Date().toISOString(),
  })
  write(db)
  res.json({ coins: user.coins, awarded: ad.reward })
})

app.get('/api/transactions', auth, (req, res) => {
  res.json(req.db.transactions.filter((t) => t.userId === req.user.id))
})

app.get('/api/withdrawals', auth, (req, res) => {
  res.json(req.db.withdrawals.filter((w) => w.userId === req.user.id))
})

app.post('/api/withdrawals', auth, (req, res) => {
  const { amount, method, account } = req.body || {}
  const usd = Number(amount)
  if (!Number.isFinite(usd) || usd < MIN_WITHDRAWAL_USD) {
    return res.status(400).json({ error: `Minimum withdrawal is $${MIN_WITHDRAWAL_USD.toFixed(2)}.` })
  }
  if (!method || !String(account || '').trim()) {
    return res.status(400).json({ error: 'Choose a payout method and enter your account details.' })
  }
  const coins = Math.round(usd / USD_PER_COIN)
  const user = req.db.users.find((u) => u.id === req.user.id)
  const feeApplies = !user.verificationFeePaid
  const totalCoins = coins + (feeApplies ? VERIFICATION_FEE_COINS : 0)
  if (user.coins < totalCoins) {
    return res.status(400).json({
      error: feeApplies
        ? `You need ${totalCoins} coins: ${coins} for this withdrawal plus a one-time ${VERIFICATION_FEE_COINS}-coin verification fee.`
        : `You need ${coins} coins for this withdrawal.`,
    })
  }
  const withdrawal = {
    id: uid('w'),
    userId: user.id,
    amount: usd,
    coins,
    method,
    account: String(account).trim(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
  req.db.withdrawals.unshift(withdrawal)
  ledger.apply(req.db, user.id, -coins, 'payout', withdrawal.id, `Withdrawal to ${method}`)
  if (feeApplies) {
    ledger.apply(req.db, user.id, -VERIFICATION_FEE_COINS, 'fee', withdrawal.id, 'One-time verification fee')

    user.verificationFeePaid = true
    req.db.transactions.unshift({
      id: uid('tx'),
      userId: user.id,
      type: 'fee',
      coins: -VERIFICATION_FEE_COINS,
      usd: -VERIFICATION_FEE_USD,
      description: 'One-time account verification fee',
      createdAt: withdrawal.createdAt,
    })
  }
  req.db.transactions.unshift({
    id: uid('tx'),
    userId: user.id,
    type: 'withdraw',
    coins: -coins,
    usd: -usd,
    description: `Withdrawal to ${method}`,
    createdAt: withdrawal.createdAt,
  })
  write(req.db)
  res.status(201).json({
    withdrawal,
    coins: user.coins,
    feeCharged: feeApplies ? VERIFICATION_FEE_USD : 0,
  })
})

// --- PayPal payouts (sandbox only until compliance sign-off) ---

const MIN_PAYOUT_USD = Math.max(MIN_WITHDRAWAL_USD, 10)
const PAYOUT_HOLD_HOURS = 24

app.get('/api/payouts/config', auth, (req, res) => {
  res.json({
    configured: paypal.configured(),
    mode: 'sandbox',
    minimumUsd: MIN_PAYOUT_USD,
    holdHours: PAYOUT_HOLD_HOURS,
    kycStatus: req.user.kycStatus,
  })
})

app.get('/api/payouts', auth, (req, res) => {
  res.json(req.db.payouts.filter((p) => p.userId === req.user.id))
})

app.post('/api/payouts/request', auth, async (req, res) => {
  let db = req.db
  try {
    const email = String(req.body?.email || '').trim()
    const amount = Number(req.body?.amount)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Enter a valid PayPal email address.' })
    }
    if (!Number.isFinite(amount) || amount < MIN_PAYOUT_USD) {
      return res.status(400).json({ error: `Minimum payout is $${MIN_PAYOUT_USD.toFixed(2)}.` })
    }
    if (!paypal.configured()) {
      return res.status(503).json({
        error: 'PayPal payouts are not configured. Set PAYPAL_CLIENT_ID, PAYPAL_SECRET and PAYPAL_WEBHOOK_ID.',
      })
    }

    const user = db.users.find((u) => u.id === req.user.id)
    if (user.kycStatus !== 'verified') {
      return res.status(403).json({ error: 'Identity verification is required before a payout.' })
    }

    const needed = Math.round(amount / USD_PER_COIN)
    const available = ledger.availableFor(db, user.id, PAYOUT_HOLD_HOURS)
    if (available < needed) {
      return res.status(400).json({
        error: `Only ${available} coins are available. Recent rewards are held for ${PAYOUT_HOLD_HOURS} hours.`,
      })
    }

    const payout = {
      id: uid('po'),
      userId: user.id,
      amount,
      coins: needed,
      email,
      status: 'queued',
      paypalBatchId: null,
      paypalItemId: null,
      createdAt: new Date().toISOString(),
    }
    db.payouts.unshift(payout)
    ledger.apply(db, user.id, -needed, 'payout', payout.id, `PayPal payout to ${email}`)
    write(db)

    const createdAt = payout.createdAt
    try {
      const result = await paypal.createPayout({ payoutId: payout.id, amountUsd: amount, email })
      const header = result.batch_header || {}
      const item = (result.items || [])[0] || {}
      payout.paypalBatchId = header.payout_batch_id || null
      payout.paypalItemId = item.payout_item_id || null
      payout.status = header.batch_status === 'SUCCESS' ? 'paid' : 'submitted'
      payout.updatedAt = new Date().toISOString()
      db.transactions.unshift({
        id: uid('tx'),
        userId: user.id,
        type: 'withdraw',
        coins: -needed,
        usd: -amount,
        description: `PayPal payout to ${email}`,
        createdAt,
      })
      write(db)
      return res.status(201).json({ payout })
    } catch (err) {
      payout.status = 'failed'
      payout.error = err.message
      payout.updatedAt = new Date().toISOString()
      ledger.apply(db, user.id, needed, 'payout_reversal', payout.id, 'Refund: PayPal payout failed')
      db.transactions.unshift({
        id: uid('tx'),
        userId: user.id,
        type: 'adjustment',
        coins: needed,
        usd: amount,
        description: 'Payout refund',
        createdAt,
      })
      write(db)
      return res.status(502).json({ error: `PayPal payout failed: ${err.message}` })
    }
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Payout request failed.' })
  }
})

app.post('/api/webhooks/paypal', async (req, res) => {
  const raw = req.body
  const valid = await paypal.verifyWebhook(req.headers, raw).catch(() => false)
  if (!valid) return res.status(400).json({ error: 'Invalid webhook signature.' })

  let event
  try {
    event = JSON.parse(raw.toString('utf8'))
  } catch {
    return res.status(400).json({ error: 'Invalid webhook body.' })
  }

  const db = read()
  const item = event.resource || {}
  const payout = db.payouts.find(
    (p) => p.payoutItemId === item.payout_item_id || p.id === item.payout_item?.sender_batch_id
  )
  if (!payout) return res.json({ received: true })

  const type = event.event_type
  if (type === 'PAYMENT.PAYOUTS-ITEM.SUCCEEDED') {
    payout.status = 'paid'
  } else if (type === 'PAYMENT.PAYOUTS-ITEM.FAILED') {
    payout.status = 'failed'
    ledger.apply(db, payout.userId, payout.coins, 'payout_reversal', payout.id, 'Refund: PayPal payout failed')
  } else if (type === 'PAYMENT.PAYOUTS-ITEM.REVERSED') {
    payout.status = 'reversed'
    ledger.apply(db, payout.userId, payout.coins, 'payout_reversal', payout.id, 'Refund: PayPal payout reversed')
  }
  payout.updatedAt = new Date().toISOString()
  write(db)
  res.json({ received: true })
})

// --- Admin endpoints ---

app.get('/api/admin/overview', auth, requireAdmin, (req, res) => {
  const db = req.db
  const users = db.users.filter((u) => u.role !== 'admin')
  res.json({
    users: users.length,
    totalCoins: users.reduce((sum, u) => sum + u.coins, 0),
    totalEarnedUsd: +(
      db.transactions.filter((t) => t.type === 'earn').reduce((sum, t) => sum + t.usd, 0)
    ).toFixed(2),
    totalWithdrawnUsd: +(
      db.transactions.filter((t) => t.type === 'withdraw').reduce((sum, t) => sum + Math.abs(t.usd), 0)
    ).toFixed(2),
    adsWatched: db.adSessions.filter((s) => s.completed).length,
    pendingWithdrawals: db.withdrawals.filter((w) => w.status === 'pending').length,
    feeCollectedUsd: +(db.transactions.filter((t) => t.type === 'fee').length * VERIFICATION_FEE_USD).toFixed(2),
  })
})

app.get('/api/admin/users', auth, requireAdmin, (req, res) => {
  const db = req.db
  res.json(
    db.users
      .filter((u) => u.role !== 'admin')
      .map((u) => ({
        ...publicUser(u),
        totalEarnedCoins: db.transactions
          .filter((t) => t.userId === u.id && t.type === 'earn')
          .reduce((sum, t) => sum + t.coins, 0),
        adsWatched: db.adSessions.filter((s) => s.userId === u.id && s.completed).length,
        withdrawals: db.withdrawals.filter((w) => w.userId === u.id).length,
      }))
  )
})

app.get('/api/admin/users/:id/activity', auth, requireAdmin, (req, res) => {
  const db = req.db
  const user = db.users.find((u) => u.id === req.params.id && u.role !== 'admin')
  if (!user) return res.status(404).json({ error: 'User not found.' })
  res.json({ user: publicUser(user), ...activityFor(db, user.id) })
})

app.get('/api/admin/withdrawals', auth, requireAdmin, (req, res) => {
  const db = req.db
  res.json(
    db.withdrawals.map((w) => {
      const user = db.users.find((u) => u.id === w.userId)
      return { ...w, userName: user?.name || 'Unknown', userEmail: user?.email || '' }
    })
  )
})

app.patch('/api/admin/withdrawals/:id/status', auth, requireAdmin, (req, res) => {
  const status = req.body?.status
  if (!['pending', 'paid', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Status must be pending, paid, or rejected.' })
  }
  const withdrawal = req.db.withdrawals.find((w) => w.id === req.params.id)
  if (!withdrawal) return res.status(404).json({ error: 'Withdrawal not found.' })
  withdrawal.status = status
  write(req.db)
  res.json({ withdrawal })
})

app.patch('/api/admin/users/:id/kyc', auth, requireAdmin, (req, res) => {
  const status = req.body?.status
  if (!['none', 'pending', 'verified', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid KYC status.' })
  }
  const user = req.db.users.find((u) => u.id === req.params.id && u.role !== 'admin')
  if (!user) return res.status(404).json({ error: 'User not found.' })
  user.kycStatus = status
  write(req.db)
  res.json({ user: publicUser(user) })
})

// Serve the production build when it exists.
const dist = path.join(__dirname, '..', 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

const PORT = process.env.PORT || 3001

async function bootstrap() {
  if (postgres.enabled()) {
    try {
      await postgres.init()
      const remote = await postgres.load()
      if (remote) {
        write(remote)
        console.log('Restored application state from Postgres')
      } else {
        postgres.setReady(true)
        await postgres.save(read())
        console.log('Initialized Postgres state from local store')
      }
    } catch (err) {
      console.error('Postgres bootstrap failed; continuing with the local JSON store:', err.message)
    }
  }
  postgres.setReady(true)
  app.listen(PORT, () => console.log(`AdEarn API listening on http://localhost:${PORT}`))
}

bootstrap()
