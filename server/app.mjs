// Production web server for Azure App Service. Node built-ins only, so the deploy package needs no node_modules.
// - Serves the built app from `distDir`, with long caching for hashed files under /assets.
// - Sends unknown page paths (e.g. /admin/users) to index.html, because the app routes in the browser.
// - Forwards /api/* to `apiTarget` (the API on Hetzner), so the browser only ever talks to this one origin.
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import http from 'node:http'
import https from 'node:https'
import path from 'node:path'
import { pipeline } from 'node:stream'
import zlib from 'node:zlib'

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.svg', '.json', '.txt'])

// Recharts and Radix set inline style attributes, so styles need 'unsafe-inline'; scripts do not.
const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; " +
    "font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'Strict-Transport-Security': 'max-age=31536000',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
}

// Hop-by-hop headers describe one connection and must not be forwarded (RFC 9110 section 7.6.1).
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

const PROXY_TIMEOUT_MS = 30_000

/**
 * @param {{ distDir: string, apiTarget: string }} options
 * @returns {http.Server}
 */
export function createApp({ distDir, apiTarget }) {
  const root = path.resolve(distDir)
  const target = new URL(apiTarget)
  const client = target.protocol === 'https:' ? https : http

  return http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      proxy(req, res, url)
      return
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, 'Method Not Allowed', { Allow: 'GET, HEAD' })
      return
    }
    serveStatic(req, res, url.pathname).catch(() => send(res, 500, 'Internal Server Error'))
  })

  /** @param {http.IncomingMessage} req @param {http.ServerResponse} res @param {URL} url */
  function proxy(req, res, url) {
    const headers = {}
    for (const [name, value] of Object.entries(req.headers)) {
      if (!HOP_BY_HOP.has(name) && name !== 'host') headers[name] = value
    }
    headers.host = target.host
    const forwardedFor = req.headers['x-forwarded-for']
    headers['x-forwarded-for'] = [forwardedFor, req.socket.remoteAddress].filter(Boolean).join(', ')
    headers['x-forwarded-proto'] = req.headers['x-forwarded-proto'] ?? 'https'
    headers['x-forwarded-host'] = req.headers.host ?? ''

    const upstream = client.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || undefined,
        method: req.method,
        path: url.pathname + url.search,
        headers,
        timeout: PROXY_TIMEOUT_MS,
      },
      (upstreamRes) => {
        const responseHeaders = {}
        for (const [name, value] of Object.entries(upstreamRes.headers)) {
          if (!HOP_BY_HOP.has(name) && value !== undefined) responseHeaders[name] = value
        }
        res.writeHead(upstreamRes.statusCode ?? 502, responseHeaders)
        pipeline(upstreamRes, res, () => {})
      },
    )
    upstream.on('timeout', () => upstream.destroy(new Error('Upstream timeout')))
    upstream.on('error', () => {
      if (res.headersSent) res.destroy()
      else send(res, 502, 'Bad Gateway')
    })
    pipeline(req, upstream, () => {})
  }

  /** @param {http.IncomingMessage} req @param {http.ServerResponse} res @param {string} pathname */
  async function serveStatic(req, res, pathname) {
    let decoded
    try {
      decoded = decodeURIComponent(pathname)
    } catch {
      send(res, 400, 'Bad Request')
      return
    }

    const file = path.resolve(root, '.' + path.posix.normalize(decoded))
    if (file !== root && !file.startsWith(root + path.sep)) {
      send(res, 404, 'Not Found')
      return
    }

    const found = await findFile(file)
    if (found) {
      const immutable = pathname.startsWith('/assets/')
      sendFile(req, res, found, immutable ? 'public, max-age=31536000, immutable' : 'no-cache')
      return
    }

    // A path with a file extension is a missing file; anything else is a page the browser router handles.
    if (path.extname(decoded)) {
      send(res, 404, 'Not Found')
      return
    }
    sendFile(req, res, path.join(root, 'index.html'), 'no-cache')
  }

  /** @param {string} file @returns {Promise<string | null>} */
  async function findFile(file) {
    try {
      const info = await stat(file)
      if (info.isFile()) return file
      if (info.isDirectory()) {
        const index = path.join(file, 'index.html')
        if ((await stat(index).catch(() => null))?.isFile()) return index
      }
    } catch {
      // Not found.
    }
    return null
  }

  /** @param {http.IncomingMessage} req @param {http.ServerResponse} res @param {string} file @param {string} cacheControl */
  function sendFile(req, res, file, cacheControl) {
    const ext = path.extname(file).toLowerCase()
    const headers = {
      ...SECURITY_HEADERS,
      'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream',
      'Cache-Control': cacheControl,
      Vary: 'Accept-Encoding',
    }
    const gzip = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')
    if (gzip) headers['Content-Encoding'] = 'gzip'

    res.writeHead(200, headers)
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    const stream = createReadStream(file)
    if (gzip) pipeline(stream, zlib.createGzip(), res, () => {})
    else pipeline(stream, res, () => {})
  }
}

/** @param {http.ServerResponse} res @param {number} status @param {string} text @param {Record<string, string>} [extra] */
function send(res, status, text, extra = {}) {
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'text/plain; charset=utf-8',
    ...extra,
  })
  res.end(text)
}
