import { setupServer } from 'msw/node'

/** Shared MSW server; add per-test handlers with `server.use(...)`. */
export const server = setupServer()
