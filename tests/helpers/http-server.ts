import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import type { RequestListener, Server } from 'node:http'

export type TestServer = {
  server: Server
  origin: string
}

/**
 * Starts an HTTP server on a random loopback port.
 *
 * Proxy tests use this to exercise a real upstream instead of mocking `fetch`.
 */
export async function startServer(listener: RequestListener): Promise<TestServer> {
  const server = createServer(listener)
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject)
      resolve()
    })
  })
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  return { server, origin: `http://127.0.0.1:${address.port}` }
}

/** Stops a server started by {@link startServer} and closes open connections. */
export async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
    server.closeAllConnections()
  })
}
