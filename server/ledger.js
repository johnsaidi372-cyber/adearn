// Append-only ledger. Balances are always derived from entries, never stored as truth.
const { uid } = require('./db')

function balanceFor(db, userId) {
  return (db.ledger || [])
    .filter((entry) => entry.userId === userId)
    .reduce((sum, entry) => sum + entry.coins, 0)
}

function apply(db, userId, coins, type, referenceId, description) {
  db.ledger = db.ledger || []
  const idempotencyKey = `${type}:${referenceId || uid('ref')}`
  const existing = db.ledger.find((entry) => entry.idempotencyKey === idempotencyKey)
  if (existing) return balanceFor(db, userId)

  db.ledger.push({
    id: uid('le'),
    userId,
    coins,
    type,
    referenceId: referenceId || null,
    idempotencyKey,
    description: description || type,
    createdAt: new Date().toISOString(),
  })

  const user = db.users.find((u) => u.id === userId)
  if (user) user.coins = balanceFor(db, userId)
  return user ? user.coins : 0
}

function availableFor(db, userId, holdHours = 24) {
  const cutoff = Date.now() - holdHours * 3600000
  return (db.ledger || [])
    .filter((entry) => entry.userId === userId && entry.coins > 0)
    .reduce((sum, entry) => {
      if (entry.type === 'adjustment' || new Date(entry.createdAt).getTime() <= cutoff) {
        return sum + entry.coins
      }
      return sum
    }, 0) - Math.abs(
      (db.ledger || [])
        .filter((entry) => entry.userId === userId && entry.coins < 0)
        .reduce((sum, entry) => sum + entry.coins, 0)
    )
}

module.exports = { apply, balanceFor, availableFor }
