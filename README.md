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

Copy or edit `.env.development` to point at your local API instance:

```
VITE_API_BASE_URL=http://localhost:5231
```

This must match the scheme/port the API is actually running on. The API also needs a CORS policy allowing `http://localhost:5173` (see `Cors:AllowedOrigins` in the API's `appsettings.Development.json`).

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
