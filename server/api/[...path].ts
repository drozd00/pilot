import { createError, defineEventHandler, proxyRequest } from 'h3'

export default defineEventHandler(async (event) => {
  const datastoreUrl = process.env.DATASTORE_URL
  if (!datastoreUrl) {
    throw createError({ statusCode: 503, statusMessage: 'Datové úložiště není nakonfigurováno.' })
  }

  const target = new URL(datastoreUrl)
  const requestPath = event.path
  const queryIndex = requestPath.indexOf('?')
  // Preserve the configured origin even for request paths starting with two slashes.
  target.pathname = queryIndex < 0 ? requestPath : requestPath.slice(0, queryIndex)
  target.search = queryIndex < 0 ? '' : requestPath.slice(queryIndex)
  target.hash = ''

  return proxyRequest(event, target.href, {
    streamRequest: true,
    fetchOptions: { signal: AbortSignal.timeout(30_000), redirect: 'manual' },
  })
})
