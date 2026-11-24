const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const DATA_DIR = path.join(__dirname, 'data')
const DB_PATH = path.join(DATA_DIR, 'db.json')

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), salt, 64).toString('hex')
}

function makeSalt() {
  return crypto.randomBytes(16).toString('hex')
}

function uid(prefix) {
  return `${prefix}_${crypto.randomBytes(10).toString('hex')}`
}

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString()
}

function adminUser() {
  const salt = makeSalt()
  return {
    id: 'u_admin',
    name: 'Administrator',
    email: 'admin@adearn.com',
    role: 'admin',
    salt,
    passwordHash: hashPassword(process.env.ADMIN_PASSWORD || 'admin1234', salt),
    coins: 0,
    token: 'admin-token',
    createdAt: daysAgo(30),
    verificationFeePaid: true,
    kycStatus: 'verified',
  }
}

function seed() {
  const salt = makeSalt()
  return {
    users: [
      adminUser(),
      {
        id: 'u_demo',
        name: 'Alex Morgan',
        email: 'demo@adearn.com',
        salt,
        passwordHash: hashPassword('demo1234', salt),
        coins: 1240,
        token: 'demo-token',
        createdAt: daysAgo(30),
        kycStatus: 'verified',
      },
    ],
    ledger: [
      {
        id: 'le_seed',
        userId: 'u_demo',
        coins: 1240,
        type: 'adjustment',
        referenceId: null,
        idempotencyKey: 'seed:demo-opening-balance',
        description: 'Opening balance',
        createdAt: daysAgo(30),
      },
    ],
    payouts: [],
    adSessions: [],
    withdrawals: [
      {
        id: 'w_seed',
        userId: 'u_demo',
        amount: 5,
        coins: 500,
        method: 'PayPal',
        account: 'alex@example.com',
        status: 'paid',
        createdAt: daysAgo(6),
      },
    ],
    transactions: [
      { id: 'tx_1', userId: 'u_demo', type: 'earn', coins: 25, usd: 0.25, description: 'Watched Orbit Bank ad', createdAt: daysAgo(1) },
      { id: 'tx_2', userId: 'u_demo', type: 'earn', coins: 20, usd: 0.2, description: 'Watched Wanderly ad', createdAt: daysAgo(2) },
      { id: 'tx_3', userId: 'u_demo', type: 'earn', coins: 18, usd: 0.18, description: 'Watched LumaPhone X ad', createdAt: daysAgo(3) },
      { id: 'tx_4', userId: 'u_demo', type: 'withdraw', coins: -500, usd: -5, description: 'Withdrawal to PayPal', createdAt: daysAgo(6) },
      { id: 'tx_5', userId: 'u_demo', type: 'earn', coins: 15, usd: 0.15, description: 'Welcome bonus', createdAt: daysAgo(30) },
    ],
  }
}

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(DB_PATH)) write(seed())
}

function ensureAdmin(data) {
  if (!data.users.some((u) => u.role === 'admin')) {
    data.users.push(adminUser())
    write(data)
  }
}

function ensureCollections(data) {
  let changed = false
  if (!Array.isArray(data.ledger)) { data.ledger = []; changed = true }
  if (!Array.isArray(data.payouts)) { data.payouts = []; changed = true }
  for (const u of data.users) {
    if (!u.kycStatus) { u.kycStatus = 'none'; changed = true }
    if (data.ledger.length === 0 && u.coins > 0) {
      data.ledger.push({
        id: uid('le'),
        userId: u.id,
        coins: u.coins,
        type: 'adjustment',
        referenceId: null,
        idempotencyKey: `migrate:${u.id}`,
        description: 'Migrated opening balance',
        createdAt: new Date().toISOString(),
      })
      changed = true
    }
  }
  if (changed) write(data)
}

function read() {
  ensure()
  let data
  try {
    data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
  } catch {
    data = seed()
    write(data)
  }
  ensureAdmin(data)
  ensureCollections(data)
  return data
}

function write(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = `${DB_PATH}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, DB_PATH)
}

module.exports = { ensure, read, write, uid, hashPassword, makeSalt }
