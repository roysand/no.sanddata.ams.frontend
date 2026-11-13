// @vitest-environment node
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { http as mswHttp, passthrough } from 'msw'
import { server as mswServer } from '../src/test/server'
import { createApp } from './app.mjs'

/** @param {http.Server} s @returns {Promise<string>} */
function listen(s) {
  return new Promise((resolve) => {
    s.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${s.address().port}`))
  })
}

/** @param {http.Server} s */
function close(s) {
  return new Promise((resolve) => s.close(() => resolve(undefined)))
}

let dir
let upstream
let upstreamUrl
let app
let base
/** @type {{ method: string, url: string, headers: http.IncomingHttpHeaders, body: string }[]} */
let received

beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'ams-dist-'))
  await mkdir(path.join(dir, 'assets'))
  await writeFile(path.join(dir, 'index.html'), '<!doctype html><title>AMS</title>')
  await writeFile(path.join(dir, 'assets', 'index-abc.js'), 'console.log("app")')
  await writeFile(path.join(dir, 'background.svg'), '<svg/>')
  await writeFile(path.join(os.tmpdir(), 'ams-secret.txt'), 'secret')

  upstream = http.createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      received.push({ method: req.method ?? '', url: req.url ?? '', headers: req.headers, body })
      if (req.url === '/api/missing') {
        res.writeHead(404, { 'Content-Type': 'application/json' })
        res.end('{"code":"NotFound"}')
        return
      }
      res.writeHead(200, { 'Content-Type': 'application/json', 'X-Upstream': 'yes' })
      res.end('{"ok":true}')
    })
  })
  upstreamUrl = await listen(upstream)
  app = createApp({ distDir: dir, apiTarget: upstreamUrl })
  base = await listen(app)
})

beforeEach(() => {
  received = []
  // The shared MSW server (src/test/setup.ts) fails unhandled requests and resets handlers after each test;
  // these tests talk to real local servers, so let those requests through.
  mswServer.use(mswHttp.all('http://127.0.0.1*', () => passthrough()))
})

afterAll(async () => {
  await close(app)
  await close(upstream)
  await rm(dir, { recursive: true, force: true })
  await rm(path.join(os.tmpdir(), 'ams-secret.txt'), { force: true })
})

/** Raw GET without fetch's automatic decompression, so headers and bytes can be checked as sent. */
function raw(pathname, headers = {}) {
  return new Promise((resolve, reject) => {
    http
      .get(base + pathname, { headers }, (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }),
        )
      })
      .on('error', reject)
  })
}

describe('static files', () => {
  it('serves index.html at / without long caching', async () => {
    const res = await raw('/')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/html')
    expect(res.headers['cache-control']).toBe('no-cache')
    expect(res.body.toString()).toContain('<title>AMS</title>')
  })

  it('serves hashed assets with immutable caching', async () => {
    const res = await raw('/assets/index-abc.js')
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('text/javascript')
    expect(res.headers['cache-control']).toContain('immutable')
  })

  it('sends page paths to index.html so the browser router can handle them', async () => {
    const res = await raw('/admin/users')
    expect(res.status).toBe(200)
    expect(res.body.toString()).toContain('<title>AMS</title>')
  })

  it('returns 404 for a missing file with an extension', async () => {
    expect((await raw('/assets/missing.js')).status).toBe(404)
  })

  it('does not serve files outside the dist folder', async () => {
    const res = await raw('/..%2Fams-secret.txt')
    expect(res.body.toString()).not.toContain('secret')
  })

  it('compresses text files when the browser accepts gzip', async () => {
    const res = await raw('/assets/index-abc.js', { 'Accept-Encoding': 'gzip, br' })
    expect(res.headers['content-encoding']).toBe('gzip')
    expect(zlib.gunzipSync(res.body).toString()).toBe('console.log("app")')
  })

  it('adds security headers', async () => {
    const res = await raw('/')
    expect(res.headers['content-security-policy']).toContain("script-src 'self'")
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-frame-options']).toBe('DENY')
  })

  it('rejects methods other than GET and HEAD for pages', async () => {
    const res = await fetch(base + '/admin/users', { method: 'POST' })
    expect(res.status).toBe(405)
  })
})

describe('/api proxy', () => {
  it('forwards method, path, query, body and authorization to the API', async () => {
    const res = await fetch(base + '/api/locations?x=1', {
      method: 'POST',
      headers: { Authorization: 'Bearer t', 'Content-Type': 'application/json' },
      body: '{"name":"Cabin"}',
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('x-upstream')).toBe('yes')
    expect(await res.json()).toEqual({ ok: true })
    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({
      method: 'POST',
      url: '/api/locations?x=1',
      body: '{"name":"Cabin"}',
    })
    expect(received[0].headers.authorization).toBe('Bearer t')
    expect(received[0].headers.host).toBe(new URL(upstreamUrl).host)
    expect(received[0].headers['x-forwarded-for']).toBeTruthy()
  })

  it('passes the API status through', async () => {
    const res = await fetch(base + '/api/missing')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ code: 'NotFound' })
  })

  it('answers 502 when the API cannot be reached', async () => {
    const dead = createApp({ distDir: dir, apiTarget: 'http://127.0.0.1:1' })
    const deadBase = await listen(dead)
    try {
      expect((await fetch(deadBase + '/api/locations')).status).toBe(502)
    } finally {
      await close(dead)
    }
  })

  it('does not treat paths that only start with "api" as API calls', async () => {
    const res = await raw('/apiary')
    expect(res.body.toString()).toContain('<title>AMS</title>')
    expect(received).toHaveLength(0)
  })
})
