# AdEarn — Architecture for Real Ads & Real PayPal Payouts

This document describes how to turn the current demo into a legitimate earn-by-watching-ads product. It deliberately **does not** carry over the "user pays a facilitation fee" idea. In a real product the platform earns from advertising revenue and pays users a share of that revenue — users never pay to withdraw.

---

## 0. Non-negotiable principles

1. **No user-paid withdrawal fees.** Money flows to the user, never from the user to the operator. If a fee exists, it is deducted from ad revenue, not charged to the user's bank/PayPal.
2. **Rewards are earned only from verified ad impressions.** The client never self-reports "I watched an ad" as the final authority.
3. **Money is a ledger, not a mutable number.** Balances are derived from immutable entries.
4. **Identity is verified before payout.** KYC/AML is mandatory.
5. **Every money movement is idempotent and auditable.**

---

## 1. Legal & compliance foundation (do this first)

| Item | Purpose |
| --- | --- |
| Registered business entity | Required to sign advertiser and PayPal Business agreements |
| Terms of Service + Privacy Policy | Must state earning rules, payout thresholds, account closure rules |
| Age gate (18+) and country eligibility | Many rewarded-ad networks restrict age and region |
| KYC provider integration | Persona / Onfido / Stripe Identity / Kycada |
| AML / sanctions / PEP screening | Required before first payout |
| Tax handling | W-9/W-8BEN collection, 1099/1042-S issuance where applicable |
| PayPal **Business** account with **Payouts** enabled | Payouts API is a distinct product from "send money" |
| Privacy/data retention policy | PII and KYC documents have strict retention rules |

Advertising copy must never promise guaranteed income. Use "up to", show typical earnings, and disclose that earnings vary.

---

## 2. Supply side: real rewarded ads

Replace the hard-coded `ADS` array with real ad-network inventory.

**Recommended networks**
- Google AdMob (rewarded video) + server-side verification (SSV)
- AppLovin MAX / IronSource (Unity LevelPlay)
- Meta Audience Network (rewarded video)
- Liftoff / Vungle, AdColony

**Reward flow (server-side verification)**

```
1. Client requests an ad -> server creates ad_session (id, user_id, nonce, expires_at)
2. Client plays rewarded video from the ad network SDK
3. Ad network calls our SSV/S2S callback with signed impression data
4. Server verifies signature, checks nonce/session, marks session complete
5. Server credits ledger atomically (double-entry, idempotent)
```

Never credit coins from a client `POST /complete` alone. The current demo's timer check is acceptable only because no real money is involved.

**Fraud controls**
- Per-user and per-device daily ad caps
- Rate limiting (min seconds between ads), random jitter checks
- Device fingerprinting + emulator/VPN/proxy detection
- CAPTCHA on sign-up and on suspicious activity
- IP reputation and anomaly scoring (sudden earning spikes)
- Manual review queue before payout

---

## 3. Ledger & balance model

Use an **append-only double-entry ledger**. Balance is always computed, never stored as the source of truth.

```sql
users (
  id uuid pk, email citext unique, password_hash, role,
  kyc_status enum('none','pending','verified','rejected'),
  country, payout_email, created_at
)

ledger_entries (
  id uuid pk,
  user_id uuid fk,
  type enum('ad_reward','payout','payout_reversal','adjustment','bonus'),
  amount_cents bigint,          -- positive = credit, negative = debit
  currency char(3) default 'USD',
  reference_id uuid,            -- ad_session or payout id
  idempotency_key text unique,
  created_at timestamptz
)

ad_sessions (
  id uuid pk, user_id uuid fk, network, nonce unique,
  status enum('issued','verified','expired','credited'),
  reward_cents int, created_at, verified_at
)

payouts (
  id uuid pk, user_id uuid fk,
  amount_cents bigint, fee_cents bigint default 0,
  paypal_batch_id, paypal_item_id,
  status enum('queued','submitted','paid','failed','reversed'),
  idempotency_key text unique,
  created_at, updated_at
)

kyc_records (user_id, provider, status, reference, created_at)
audit_logs (id, actor_id, action, target, metadata jsonb, created_at)
```

**Balance rules**
- `available = SUM(ledger_entries) - pending_payouts`
- Add a **holding period** (e.g. 24–72h) before rewards become withdrawable, to cover fraud/chargebacks.
- Fixed, published conversion: e.g. 100 coins = $1. Never change it silently.

---

## 4. PayPal Payouts integration

Use the **PayPal Payouts API** (`/v1/payments/payouts`), not friends/family transfers.

**Setup**
1. PayPal Business account, Payouts feature approved.
2. Create REST app in PayPal Developer Dashboard → client ID + secret.
3. Start in **Sandbox**, move to Live only after compliance is complete.
4. Store credentials in a secret manager / env vars; never in the repo.

**Flow**

```
1. User requests payout -> server validates:
   - KYC verified
   - balance >= minimum
   - no fraud flags
2. Server creates payout row (status=queued) + debit ledger entry
3. Worker posts to PayPal Payouts API with idempotency key
   POST /v1/payments/payouts
   {
     "sender_batch_header": {
       "sender_batch_id": "<payout.id>",
       "email_subject": "You have a payment from AdEarn"
     },
     "items": [{
       "recipient_type": "EMAIL",
       "amount": { "value": "10.00", "currency": "USD" },
       "receiver": "<user.payout_email>",
       "note": "AdEarn earnings",
       "supplementary_data": { "related_ids": { "order_id": "<payout.id>" } }
     }]
   }
4. Store returned batch id + payout item id
5. PayPal webhook updates status:
   PAYMENT.PAYOUTS-ITEM.SUCCEEDED  -> paid
   PAYMENT.PAYOUTS-ITEM.FAILED     -> failed, re-credit ledger
   PAYMENT.PAYOUTS-ITEM.REVERSED   -> reversed, re-credit + flag account
6. Verify every webhook with PayPal's /v1/notifications/verify-webhook-signature
```

**Webhook verification (required)**: compute signature from `transmissionId`, `transmissionTime`, `webhookId`, `crc32(body)` and call PayPal's verify endpoint. Reject invalid signatures.

**Operational rules**
- Payout batches run on a schedule (e.g. daily), not per click
- Minimum payout (e.g. $10) and maximum per-transaction limits
- Dual approval for payouts above a threshold
- Retry with exponential backoff; never double-submit (idempotency key)
- Reconcile PayPal batch reports against ledger daily

---

## 5. Fraud, abuse and financial controls

- Daily/weekly payout caps per user and globally
- Cooling-off period between ad view and payout eligibility
- Automated hold on anomalous accounts; human review before release
- Reserve fund for reversals and disputes
- Monthly reconciliation report: ad revenue received vs user liabilities
- Separate roles: `support`, `finance`, `admin` with least privilege and 2FA
- Immutable audit log for every balance/payout change

---

## 6. Infrastructure

| Concern | Choice |
| --- | --- |
| Database | PostgreSQL (managed, with backups/PITR) |
| Cache/rate limits | Redis |
| API | Node + Express/NestJS, behind a load balancer |
| Background jobs | BullMQ workers for payouts and reconciliation |
| Webhooks | Dedicated endpoints with signature verification |
| Secrets | Secret manager / env vars, never committed |
| Monitoring | Structured logs, alerts on failed payouts and webhook errors |
| Auth | OIDC/OAuth2 or hardened sessions, 2FA for staff |

---

## 7. Migration plan from the current demo

**Phase 1 — Real ad supply**
- Replace `ADS` catalog with an ad network SDK/API
- Add SSV/S2S callback with signature verification
- Remove client-side timer as the authority for crediting

**Phase 2 — Ledger**
- Introduce Postgres and the schema above
- Migrate coins to a derived balance; add idempotency keys
- Add holding period and payout eligibility rules

**Phase 3 — Identity**
- Integrate KYC provider and country/age eligibility
- Add tax form collection

**Phase 4 — Payouts**
- PayPal Payouts integration in sandbox
- Webhook handling with signature verification
- Admin payout approval workflow and reconciliation job

**Phase 5 — Launch**
- Legal review, terms/privacy, compliance checks
- Enable live PayPal credentials only after sign-off
- Gradual rollout with low payout caps initially

---

## 8. What must be removed from the current demo

- `VERIFICATION_FEE_USD` / one-time $3 fee charged to users
- Any instruction to send money to a personal PayPal account
- The idea that a user pays to unlock earnings
- Client-side timer as proof of ad completion

Revenue comes from advertisers. Users are paid a share. That is the model that can support real PayPal payouts legally and sustainably.
