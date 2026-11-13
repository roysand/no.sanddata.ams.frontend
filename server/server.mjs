// Entry point on Azure App Service (startup command: `node server.mjs`). The deploy package puts this file next to
// app.mjs and the built app in ./dist. App Service sets PORT; API_PROXY_TARGET is an app setting.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createApp } from './app.mjs'

const apiTarget = process.env.API_PROXY_TARGET
if (!apiTarget) {
  console.error(
    'API_PROXY_TARGET is not set; it must be the API base URL, e.g. https://ams-api.sanddata.eu',
  )
  process.exit(1)
}

const port = Number(process.env.PORT ?? 8080)
const distDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist')

createApp({ distDir, apiTarget }).listen(port, () => {
  console.log(`Serving ${distDir} on port ${port}; /api -> ${apiTarget}`)
})
