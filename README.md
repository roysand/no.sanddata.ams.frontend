# no.sanddata.ams.frontend

Web UI for the AMS (electrical grid power-usage measurement) platform. Consumes [no.sanddata.ams.api](https://github.com/roysand/no.sanddata.ams.api).

## Stack

- **React 19** + **TypeScript**, built with **Vite**
- **Tailwind CSS 4** (CSS-first config, no `tailwind.config.js`)
- **React Router 7** for routing
- **TanStack Query 5** for server state / data fetching
- **React Hook Form** + **Zod** for form handling and validation
- **ESLint** + **Prettier** for linting and formatting

## Getting Started

Requires Node.js 22+.

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

### Configuration

Copy `.env.example` to `.env` (git-ignored) and edit it to choose which API the dev server talks to:

```
# Local API
API_PROXY_TARGET=https://localhost:7130
# API on the internet
API_PROXY_TARGET=https://ams-api.sanddata.eu
```

The dev server proxies `/api` requests to `API_PROXY_TARGET`, so no CORS setup is needed in development. Restart `npm run dev` after changing `.env`. If unset, it defaults to `https://ams-api.sanddata.eu`.

This must match the scheme/port the API is actually running on. For production builds, set `VITE_API_BASE_URL` to the API's URL instead.

## Scripts

| Command           | Purpose                              |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Vite dev server            |
| `npm run build`   | Type-check and build for production  |
| `npm run preview` | Preview the production build locally |
| `npm run lint`    | Run ESLint                           |
| `npm run format`  | Format the codebase with Prettier    |

## Project Structure

Feature-sliced, mirroring the API's vertical-slice architecture:

```
src/
  app/            Router setup and top-level providers (App.tsx, routes.tsx)
  features/
    auth/         Login form, auth context/hook, API calls, session restore
    measurements/ Measurement views
  components/     Shared components (e.g. ProtectedRoute)
  lib/            API client, auth token store, TanStack Query client
```

## Authentication

- Login calls `POST /api/auth/login` and stores the access token in memory only and the refresh token in `localStorage`.
- `lib/apiClient.ts` automatically retries a request once with a refreshed access token on `401`.
- On page load, if a refresh token is present, the session is silently restored via `POST /api/auth/refresh` followed by `GET /api/auth/me` (see `features/auth/api.ts`).
