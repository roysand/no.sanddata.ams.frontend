import { useAuth } from '../auth/useAuth'

export function MeasurementsPage() {
  const { email, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Measurements</h1>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span>{email}</span>
          <button onClick={logout} className="text-slate-900 underline">
            Sign out
          </button>
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-600">No data yet.</p>
    </div>
  )
}
