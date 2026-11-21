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

function seed() {
  const salt = makeSalt()
  return {
    users: [
      {
        id: 'u_demo',
        name: 'Alex Morgan',
        email: 'demo@adearn.com',
        salt,
        passwordHash: hashPassword('demo1234', salt),
        coins: 1240,
        token: 'demo-token',
        createdAt: daysAgo(30),
      },
    ],
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

function read() {
  ensure()
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
  } catch {
    const fresh = seed()
    write(fresh)
    return fresh
  }
}

function write(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = `${DB_PATH}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, DB_PATH)
}

module.exports = { ensure, read, write, uid, hashPassword, makeSalt }
