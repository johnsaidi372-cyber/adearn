// Optional durable persistence. The JSON file remains the local cache/source of truth;
// its full state is written through to Postgres on every change when DATABASE_URL is set.
const CONNECTION_STRING = process.env.DATABASE_URL

let pool = null
let ready = false
let queue = Promise.resolve()

function enabled() {
  return Boolean(CONNECTION_STRING)
}

function getPool() {
  if (!pool) {
    const { Pool } = require('pg')
    pool = new Pool({
      connectionString: CONNECTION_STRING,
      ssl: { rejectUnauthorized: false },
      max: 5,
    })
  }
  return pool
}

function setReady(value) {
  ready = value
}

async function init() {
  if (!enabled()) return
  await getPool().query(
    'CREATE TABLE IF NOT EXISTS app_state (id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ DEFAULT NOW())'
  )
}

async function load() {
  if (!enabled()) return null
  const result = await getPool().query('SELECT data FROM app_state WHERE id = $1', ['main'])
  return result.rows[0]?.data || null
}

function save(data) {
  if (!enabled() || !ready) return Promise.resolve()
  const payload = JSON.stringify(data)
  queue = queue
    .catch(() => {})
    .then(() =>
      getPool().query(
        `INSERT INTO app_state (id, data, updated_at) VALUES ('main', $1, NOW())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
        [payload]
      )
    )
  return queue
}

module.exports = { enabled, init, load, save, setReady }
