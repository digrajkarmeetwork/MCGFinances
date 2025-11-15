import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

type Summary = {
  cashOnHand: number
  monthlyBurn: number
  runwayMonths: number
  updatedAt: string
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

const resolveApiBase = () => {
  const envValue = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  if (envValue) {
    return envValue.replace(/\/$/, '')
  }

  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    if (origin.includes('mcgfinances.onrender.com')) {
      return 'https://mcgfinances-api.onrender.com'
    }
  }

  return undefined
}

const mockTrends = [
  { label: 'Payroll', change: '-2.1% vs last month', tone: 'down' },
  { label: 'Marketing', change: '+6.4% vs last month', tone: 'up' },
  { label: 'Software', change: '+1.3% vs last month', tone: 'flat' },
]

const mockActivity = [
  { title: 'Invoice #4215 paid', detail: 'Design project', amount: '+$6,200' },
  { title: 'New bill: SaaS Platform', detail: 'Due Apr 18', amount: '-$960' },
  { title: 'Tax reserve transfer', detail: 'State filings', amount: '-$2,100' },
]

function App() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem('mcgfinances.token')
  })
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    organizationName: '',
  })
  const [authError, setAuthError] = useState<string | null>(null)
  const [authBusy, setAuthBusy] = useState(false)
  const [profile, setProfile] = useState<{
    user: { id: string; email: string }
    organization: { id: string; name: string }
  } | null>(null)

  const apiBaseMemo = useMemo(() => resolveApiBase(), [])

  const buildUrl = useCallback(
    (path: string) => {
      const suffix = path.startsWith('/') ? path : `/${path}`
      if (!apiBaseMemo) {
        return suffix
      }
      try {
        return new URL(suffix, `${apiBaseMemo}/`).toString()
      } catch {
        return `${apiBaseMemo}${suffix}`
      }
    },
    [apiBaseMemo],
  )

  const loadProfile = useCallback(async () => {
    if (!token) {
      setProfile(null)
      return
    }
    try {
      const res = await fetch(buildUrl('/api/v1/auth/me'), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        throw new Error('The session expired, please sign in again.')
      }
      const data = (await res.json()) as {
        user: { id: string; email: string }
        organization: { id: string; name: string }
      }
      setProfile(data)
    } catch (err) {
      setToken(null)
      window.localStorage.removeItem('mcgfinances.token')
      setProfile(null)
      setAuthError(
        err instanceof Error ? err.message : 'Unable to load profile',
      )
    }
  }, [buildUrl, token])

  const loadSummary = useCallback(async () => {
    if (!token) {
      setSummary(null)
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(buildUrl('/api/v1/summary'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please login again.')
        }
        throw new Error('Network response was not ok')
      }
      const data = (await response.json()) as Summary
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [buildUrl, token])

  useEffect(() => {
    loadProfile()
    loadSummary()
  }, [loadProfile, loadSummary])

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthBusy(true)
    setAuthError(null)
    try {
      const endpoint =
        authMode === 'signup' ? '/api/v1/auth/signup' : '/api/v1/auth/login'
      const payload =
        authMode === 'signup'
          ? authForm
          : { email: authForm.email, password: authForm.password }
      const response = await fetch(buildUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const details = await response.json().catch(() => ({}))
        throw new Error(details.message || 'Unable to authenticate')
      }
      const data = (await response.json()) as {
        token: string
        user: { id: string; email: string }
        organization: { id: string; name: string }
      }
      setToken(data.token)
      window.localStorage.setItem('mcgfinances.token', data.token)
      setProfile({ user: data.user, organization: data.organization })
      setAuthForm({ email: '', password: '', organizationName: '' })
      setAuthMode('login')
      loadSummary()
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to authenticate')
    } finally {
      setAuthBusy(false)
    }
  }

  const handleLogout = () => {
    setToken(null)
    setProfile(null)
    window.localStorage.removeItem('mcgfinances.token')
    setSummary(null)
  }

  const kpiCards = summary
    ? [
        {
          label: 'Cash on hand',
          value: formatCurrency(summary.cashOnHand),
          caption: 'Operating + savings',
        },
        {
          label: 'Monthly burn',
          value: formatCurrency(summary.monthlyBurn),
          caption: 'Includes payroll + vendors',
        },
        {
          label: 'Runway',
          value: `${summary.runwayMonths.toFixed(1)} months`,
          caption: 'Target ≥ 6 months',
        },
      ]
    : []

  return (
    <div className="shell">
      <div className="shell__glow" />
      <main className="shell__main">
        <nav className="nav">
          <div>
            <p className="logo">MCGFinances</p>
            <span className="badge">Beta</span>
          </div>
          <div className="nav__actions">
            {profile ? (
              <>
                <span className="pill">{profile.user.email}</span>
                <button className="ghost" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <button className="ghost">Support</button>
                <button className="primary" onClick={() => setAuthMode('signup')}>
                  Add account
                </button>
              </>
            )}
          </div>
        </nav>

        <header className="hero">
          <div>
            <p className="eyebrow">Control Center</p>
            <h1>Financial health, crystal clear</h1>
            <p className="lead">
              Monitor cash flow, runway, and spend drivers from one workspace.
              Perfect for founders and advisors on the move.
            </p>
          </div>
          {profile && (
            <button className="refresh" onClick={loadSummary} disabled={loading}>
              {loading ? 'Refreshing…' : 'Refresh data'}
            </button>
          )}
        </header>

        {!profile && (
          <section className="auth-panel">
            <div className="auth-tabs">
              <button
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => setAuthMode('login')}
              >
                Login
              </button>
              <button
                className={authMode === 'signup' ? 'active' : ''}
                onClick={() => setAuthMode('signup')}
              >
                Sign up
              </button>
            </div>
            <form onSubmit={handleAuthSubmit} className="auth-form">
              <label>
                <span>Email</span>
                <input
                  type="email"
                  value={authForm.email}
                  onChange={(event) =>
                    setAuthForm((prev) => ({
                      ...prev,
                      email: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={authForm.password}
                  minLength={6}
                  onChange={(event) =>
                    setAuthForm((prev) => ({
                      ...prev,
                      password: event.target.value,
                    }))
                  }
                  required
                />
              </label>
              {authMode === 'signup' && (
                <label>
                  <span>Business name</span>
                  <input
                    type="text"
                    value={authForm.organizationName}
                    onChange={(event) =>
                      setAuthForm((prev) => ({
                        ...prev,
                        organizationName: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              )}
              {authError && <p className="auth-error">{authError}</p>}
              <button className="primary" type="submit" disabled={authBusy}>
                {authBusy
                  ? 'One moment…'
                  : authMode === 'signup'
                  ? 'Create account'
                  : 'Login'}
              </button>
            </form>
          </section>
        )}

        {error && (
          <div className="panel error">
            <strong>Unable to load summary.</strong> {error}
          </div>
        )}

        {loading && profile && !summary && !error && (
          <div className="panel loading">
            <div className="dots">
              <span />
              <span />
              <span />
            </div>
            <p>Syncing with your bank feeds…</p>
          </div>
        )}

        {profile && summary && (
          <>
            <section className="kpis">
              {kpiCards.map((card) => (
                <article key={card.label} className="kpis__card">
                  <p className="kpis__label">{card.label}</p>
                  <p className="kpis__value">{card.value}</p>
                  <p className="kpis__caption">{card.caption}</p>
                </article>
              ))}
            </section>

            <section className="grid">
              <article className="panel insights">
                <div className="panel__header">
                  <h2>Spend pulse</h2>
                  <span>Last 30 days</span>
                </div>
                <ul>
                  {mockTrends.map((trend) => (
                    <li key={trend.label}>
                      <div>
                        <p>{trend.label}</p>
                        <small>{trend.change}</small>
                      </div>
                      <span className={`trend trend--${trend.tone}`} />
                    </li>
                  ))}
                </ul>
              </article>

              <article className="panel activity">
                <div className="panel__header">
                  <h2>Recent activity</h2>
                  <span>Automatic & manual entries</span>
                </div>
                <ul>
                  {mockActivity.map((item) => (
                    <li key={item.title}>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.detail}</p>
                      </div>
                      <span className="amount">{item.amount}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </section>

            <section className="panel advisory">
              <div>
                <h2>Advisor notes</h2>
                <p>
                  Stay under {formatCurrency(summary.monthlyBurn)} in monthly
                  burn to preserve {summary.runwayMonths.toFixed(1)} months of
                  runway. Review discretionary spend weekly and flag anomalies.
                </p>
              </div>
              <button className="ghost">Share report</button>
            </section>
          </>
        )}

        <footer className="footer">
          {profile && summary ? (
            <p>
              Last updated {new Date(summary.updatedAt).toLocaleString()} ·
              synced nightly & on demand.
            </p>
          ) : (
            <p>Create an account or log in to see your finance workspace.</p>
          )}
        </footer>
      </main>
    </div>
  )
}

export default App
