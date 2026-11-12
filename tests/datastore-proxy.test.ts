/**
 * Integration tests for the datastore proxy in `server/api/[...path].ts`.
 *
 * Starts real HTTP servers to verify forwarding of method, path, query, body, and
 * cookies, preservation of upstream status and payloads, and the missing-configuration
 * response.
 */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { createApp, toNodeListener } from 'h3'
import proxyDatastoreRequest from '../server/api/[...path]'
import { closeServer, startServer } from './helpers/http-server.ts'

describe('server/api/[...path]', () => {
  test('the app forwards datastore requests without a PostgreSQL connection', async (context) => {
    const previousDatastoreUrl = process.env.DATASTORE_URL
    const previousDatabaseUrl = process.env.DATABASE_URL
    delete process.env.DATABASE_URL
    context.after(() => {
      if (previousDatastoreUrl === undefined) delete process.env.DATASTORE_URL
      else process.env.DATASTORE_URL = previousDatastoreUrl
      if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL
      else process.env.DATABASE_URL = previousDatabaseUrl
    })

    const upstream = await startServer(async (request, response) => {
      const chunks: Buffer[] = []
      for await (const chunk of request) chunks.push(Buffer.from(chunk))
      const body = Buffer.concat(chunks).toString('utf8')
      response.setHeader('Content-Type', 'application/json')
      if (request.url === '/api/rejected') {
        response.statusCode = 422
        response.end(JSON.stringify({ statusCode: 422, data: { issues: ['scenario-mismatch'] } }))
        return
      }
      response.setHeader(
        'Set-Cookie',
        'study-session=renewed-session; Path=/; HttpOnly; SameSite=Strict',
      )
      response.end(
        JSON.stringify({
          method: request.method,
          path: request.url,
          cookie: request.headers.cookie,
          contentType: request.headers['content-type'],
          body,
        }),
      )
    })
    context.after(async () => closeServer(upstream.server))
    process.env.DATASTORE_URL = upstream.origin

    const app = createApp()
    app.use(proxyDatastoreRequest)
    const proxy = await startServer(toNodeListener(app))
    context.after(async () => closeServer(proxy.server))

    await context.test('forwards the session cookie and returns Set-Cookie', async () => {
      const response = await fetch(`${proxy.origin}/api/sessions/current`, {
        headers: { Cookie: 'study-session=original-session' },
      })
      assert.equal(response.status, 200)
      assert.equal(
        response.headers.get('set-cookie'),
        'study-session=renewed-session; Path=/; HttpOnly; SameSite=Strict',
      )
      const result = await response.json()
      assert.equal(result.cookie, 'study-session=original-session')
      assert.equal(result.path, '/api/sessions/current')
    })

    await context.test('forwards the POST body, method, path, and query unchanged', async () => {
      const body = JSON.stringify({
        sessionId: 'session-id',
        nested: { label: 'Příliš žluťoučký' },
      })
      const path = '/api/trials/trial-id/events?source=browser&value=a%2Bb'
      const response = await fetch(`${proxy.origin}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      assert.equal(response.status, 200)
      const result = await response.json()
      assert.equal(result.method, 'POST')
      assert.equal(result.path, path)
      assert.equal(result.contentType, 'application/json')
      assert.equal(result.body, body)
    })

    await context.test('preserves datastore validation status and response data', async () => {
      const response = await fetch(`${proxy.origin}/api/rejected`)
      assert.equal(response.status, 422)
      const result = await response.json()
      assert.deepEqual(result, { statusCode: 422, data: { issues: ['scenario-mismatch'] } })
    })

    await context.test(
      'keeps double-slash request paths on the configured datastore origin',
      async () => {
        const path = '//untrusted.invalid/api/health'
        const response = await fetch(`${proxy.origin}${path}`)
        assert.equal(response.status, 200)
        const result = await response.json()
        assert.equal(result.path, path)
      },
    )

    await context.test('returns 503 when DATASTORE_URL is missing', async () => {
      delete process.env.DATASTORE_URL
      const response = await fetch(`${proxy.origin}/api/health`)
      assert.equal(response.status, 503)
      const result = await response.json()
      assert.equal(result.statusCode, 503)
    })
  })
})
