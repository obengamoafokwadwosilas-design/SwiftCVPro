import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import vm from 'node:vm'
import { PGlite } from '@electric-sql/pglite'

const require = createRequire(import.meta.url)
const ts = require('typescript')
const db = new PGlite()
let owner, other
before(async () => {
  await db.exec('create role anon; create role authenticated; create role service_role;')
  const sql = await readFile(new URL('../supabase_email_identity.sql', import.meta.url), 'utf8')
  await db.exec(sql)
  await db.exec(sql)
  owner = (await db.query("insert into customers(email) values('owner@example.com') returning id")).rows[0].id
  other = (await db.query("insert into customers(email) values('other@example.com') returning id")).rows[0].id
})
after(async () => { await db.close() })
async function scalar(sql, args = []) {
  const row = (await db.query(sql, args)).rows[0]
  return Object.values(row)[0]
}

test('migration can be repeated without deleting existing data', async () => {
  assert.equal(await scalar('select count(*)::int from customers'), 2)
})
test('access links expire and can be redeemed only once', async () => {
  await db.query("insert into customer_access_links(token_hash, owner_id, expires_at) values('valid', $1, now()+interval '30 minutes'),('expired', $1, now()-interval '1 second')", [owner])
  assert.equal(await scalar('select consume_customer_link($1)', ['expired']), null)
  const results = await Promise.all([scalar('select consume_customer_link($1)', ['valid']), scalar('select consume_customer_link($1)', ['valid'])])
  assert.deepEqual(results.sort(), [null, owner].sort())
})
test('PIN guessing locks out even a correct guess until the cooldown ends', async () => {
  for (let i = 0; i < 5; i++) assert.equal(await scalar('select record_customer_pin_attempt($1, false)', ['guess']), false)
  assert.equal(await scalar('select record_customer_pin_attempt($1, true)', ['guess']), false)
  await db.query("update customer_pin_attempts set locked_until = now()-interval '1 second' where bucket = 'guess'")
  assert.equal(await scalar('select record_customer_pin_attempt($1, true)', ['guess']), true)
})
test('email sends have an atomic shared cooldown', async () => {
  const sends = await Promise.all(Array.from({ length: 5 }, () => scalar("select reserve_customer_send('email-test', 60)")))
  assert.equal(sends.filter(Boolean).length, 1)
})
test('a failed payment allocation rolls back its payment marker', async () => {
  await assert.rejects(() => db.query('select credit_customer_payment($1, $2, $3, 3900, -1, 0)', [other, 'failed', 'silver']))
  assert.equal(await scalar("select count(*)::int from customer_payments where paystack_reference = 'failed'"), 0)
})
test('webhook and verification retries allocate purchased credits once', async () => {
  const results = await Promise.all(Array.from({ length: 5 }, () => scalar('select credit_customer_payment($1, $2, $3, 3900, 1, 0)', [owner, 'purchase', 'silver'])))
  assert.equal(results.filter(Boolean).length, 1)
  assert.equal(await scalar('select credits from customer_credits where owner_id = $1', [owner]), 1)
})
test('paid downloads cannot cross owners or document types; PDF and Word share one charge', async () => {
  const id = await scalar("insert into customer_history(owner_id, cv_type, template_id, generated_cv, raw_input) values($1, 'professional', 'classic', '{}', '{}') returning id", [owner])
  assert.equal(await scalar('select pay_customer_document($1, $2, false)', [other, id]), false)
  assert.equal(await scalar('select pay_customer_document($1, $2, true)', [owner, id]), false)
  const downloads = await Promise.all(Array.from({ length: 3 }, () => scalar('select pay_customer_document($1, $2, false)', [owner, id])))
  assert.deepEqual(downloads, [true, true, true])
  assert.equal(await scalar('select credits from customer_credits where owner_id = $1', [owner]), 0)
})
test('email preview cap and IP hour limit cannot be bypassed by request retries', async () => {
  const results = await Promise.all(Array.from({ length: 4 }, () => scalar("select consume_customer_preview('email-one', 'shared-ip', false, 2)")))
  assert.equal(results.filter(Boolean).length, 2)
  await db.exec("select refund_customer_preview('email-one', 'shared-ip', false)")
  assert.equal(await scalar("select consume_customer_preview('email-one', 'shared-ip', false, 2)"), true)
  for (let i = 0; i < 18; i++) assert.equal(await scalar('select consume_customer_preview($1, $2, false, 2)', ['email-' + i, 'shared-ip']), true)
  assert.equal(await scalar("select consume_customer_preview('fresh-email', 'shared-ip', true, 2)"), false)
})
test('anon and authenticated roles cannot access private tables or RPCs', async () => {
  const tables = (await db.query("select tablename from pg_tables where schemaname = 'public' and (tablename like 'customer_%' or tablename = 'customers')")).rows
  for (const { tablename } of tables) {
    for (const role of ['anon', 'authenticated']) {
      assert.equal(await scalar("select has_table_privilege($1, $2, 'select')", [role, tablename]), false)
    }
  }
  assert.equal(await scalar("select has_function_privilege('anon', 'public.consume_customer_link(text)', 'execute')"), false)
  assert.equal(await scalar("select has_function_privilege('authenticated', 'public.credit_customer_payment(uuid,text,text,integer,integer,integer)', 'execute')"), false)
})

async function route(path, mocks = {}) {
  const source = await readFile(new URL('../' + path, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
  const module = { exports: {} }
  const context = { module, exports: module.exports, console, Date, Request, Response, Buffer, process,
    require: id => {
      if (id === 'next/server') return { NextResponse: { json: (body, init) => Response.json(body, init) } }
      if (Object.hasOwn(mocks, id)) return mocks[id]
      throw new Error('Unexpected route dependency: ' + id)
    },
  }
  vm.runInNewContext(compiled, context, { filename: path })
  return module.exports
}
const request = body => new Request('http://localhost/api/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const forbiddenDb = { supabaseAdmin: { from() { throw new Error('Unauthorized request touched private data') } } }

test('typing another email or supplying the legacy PIN never opens history', async () => {
  const handler = await route('app/api/cv-history/list/route.ts', {
    '@/lib/customerAuth': { currentAccess: async () => null }, '@/lib/supabase': forbiddenDb,
  })
  const result = await handler.POST(request({ email: 'owner@example.com', phoneNumber: '0551234567', pin: '1234' }))
  assert.equal(result.status, 401)
})
test('a PIN cannot be planted without a fresh verified email session', async () => {
  for (const access of [null, { id: owner, verifiedAt: new Date(0).toISOString() }]) {
    const handler = await route('app/api/cv-pin/set/route.ts', {
      '@/lib/customerAuth': { currentAccess: async () => access }, '@/lib/supabase': forbiddenDb,
      '@/lib/pin': { hashPin: () => { throw new Error('Unverified PIN was hashed') }, isValidPinFormat: () => true },
    })
    assert.equal((await handler.POST(request({ email: 'owner@example.com', pin: '1234' }))).status, 401)
  }
})
test('credit lookup reveals no balance for an unverified email', async () => {
  const handler = await route('app/api/check-credits/route.ts', {
    '@/lib/customerAuth': { currentAccess: async () => null }, '@/lib/email': { normalizeEmail: value => value },
    '@/lib/credits': { getCredits: () => { throw new Error('Leaked credit balance') }, getCoverLetterCredits: () => { throw new Error('Leaked credit balance') } },
  })
  const body = await (await handler.POST(request({ email: 'owner@example.com' }))).json()
  assert.equal(body.credits, 0)
  assert.equal(body.verificationRequired, true)
})
