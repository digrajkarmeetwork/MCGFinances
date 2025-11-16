import type { FormEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

type Summary = {
  cashOnHand: number
  monthlyBurn: number
  runwayMonths: number
  updatedAt: string
}

type Transaction = {
  id: string
  description: string
  amount: number
  type: 'INCOME' | 'EXPENSE'
  occurredAt: string
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))

const resolveApiBase = () => {
  const envValue = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  if (envValue) {
    return envValue.replace(/\/$/, '')
  }

  if (typeof window !== 'undefined') {
    const origin = window.location.origin
    if (origin.includes('mcgfinances')) {
      return 'https://mcgfinances-api.onrender.com'
    }
  }

  return undefined
}

const readBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return response.json()
  }
  return response.text()
}

const extractError = (payload: unknown, fallback: string) => {
  if (typeof payload === 'string') {
    const trimmed = payload.trim()
    return trimmed.length ? trimmed : fallback
  }
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const value = (payload as { message?: string }).message?.trim()
    if (value) return value
  }
  return fallback
}

function App() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
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
  const [txForm, setTxForm] = useState({
    description: '',
    amount: '',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    occurredAt: '',
  })
  const [exportRange, setExportRange] = useState({ from: '', to: '' })
  const [exportBusy, setExportBusy] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)
  const [txBusy, setTxBusy] = useState(false)

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
      const payload = await readBody(res)
      if (!res.ok) {
        throw new Error(extractError(payload, 'The session expired.'))
      }
      const data = payload as {
        user: { id: string; email: string }
        organization: { id: string; name: string }
      }
      setProfile(data)
    } catch (err) {
      setToken(null)
      window.localStorage.removeItem('mcgfinances.token')
      setProfile(null)
      setAuthError(err instanceof Error ? err.message : 'Unable to load profile')
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
      const payload = await readBody(response)
      if (!response.ok) {
        throw new Error(extractError(payload, 'Unable to load summary'))
      }
      const data = payload as Summary
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [buildUrl, token])

  const loadTransactions = useCallback(async () => {
    if (!token) {
      setTransactions([])
      return
    }
    try {
      const response = await fetch(buildUrl('/api/v1/transactions'), {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await readBody(response)
      if (!response.ok) {
        throw new Error(extractError(payload, 'Unable to load transactions'))
      }
      if (Array.isArray(payload)) {
        setTransactions(payload as Transaction[])
      } else {
        throw new Error('Malformed transactions payload')
      }
    } catch (err) {
      setTxError(err instanceof Error ? err.message : 'Unable to load data')
      setTransactions([])
    }
  }, [buildUrl, token])

  useEffect(() => {
    loadProfile()
    loadSummary()
    loadTransactions()
  }, [loadProfile, loadSummary, loadTransactions])

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuthBusy(true)
    setAuthError(null)
    try {
      const endpoint =
        authMode === 'signup' ? '/api/v1/auth/signup' : '/api/v1/auth/login'
      const payloadBody =
        authMode === 'signup'
          ? authForm
          : { email: authForm.email, password: authForm.password }
      const response = await fetch(buildUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadBody),
      })
      const payload = await readBody(response)
      if (!response.ok) {
        throw new Error(extractError(payload, 'Unable to authenticate'))
      }
      const data = payload as {
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
      loadTransactions()
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
    setTransactions([])
  }

  const handleTransactionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTxBusy(true)
    setTxError(null)
    try {
      if (!token) {
        throw new Error('Please log in to add activity.')
      }
      const payloadBody = {
        description: txForm.description,
        amount: Number(txForm.amount),
        type: txForm.type,
        occurredAt: txForm.occurredAt || undefined,
      }
      const response = await fetch(buildUrl('/api/v1/transactions'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payloadBody),
      })
      const payload = await readBody(response)
      if (!response.ok) {
        throw new Error(extractError(payload, 'Unable to save transaction'))
      }
      const transaction = payload as Transaction
      setTransactions((prev) => [transaction, ...prev].slice(0, 100))
      setTxForm({ description: '', amount: '', type: 'EXPENSE', occurredAt: '' })
      loadSummary()
    } catch (err) {
      setTxError(err instanceof Error ? err.message : 'Unable to save entry')
    } finally {
      setTxBusy(false)
    }
  }

  const handleExport = async () => {
    if (!token) {
      setTxError('Please log in to export data.')
      return
    }
    try {
      setExportBusy(true)
      const params = new URLSearchParams()
      if (exportRange.from) params.append('from', exportRange.from)
      if (exportRange.to) params.append('to', exportRange.to)
      const response = await fetch(
        buildUrl(`/api/v1/transactions/export?${params.toString()}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )
      if (!response.ok) {
        const payload = await readBody(response)
        throw new Error(extractError(payload, 'Failed to export transactions'))
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'transactions.pdf'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setTxError(err instanceof Error ? err.message : 'Unable to export data')
    } finally {
      setExportBusy(false)
    }
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
          value:
            summary.monthlyBurn > 0
              ? `${summary.runwayMonths.toFixed(1)} months`
              : 'Track expenses to unlock',
          caption: 'Target ≥ 6 months',
        },
      ]
    : []

  const transactionTotals = useMemo(
    () =>
      transactions.reduce(
        (acc, transaction) => {
          if (transaction.type === 'INCOME') {
            acc.income += transaction.amount
          } else {
            acc.expense += transaction.amount
          }
          return acc
        },
        { income: 0, expense: 0 },
      ),
    [transactions],
  )

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
            {profile && profile.user ? (
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

        {!profile?.user && (
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
                  <h2>Cash pulse</h2>
                  <span>Last 30 days</span>
                </div>
                <div className="totals">
                  <div>
                    <p>Incoming</p>
                    <strong>{formatCurrency(transactionTotals.income)}</strong>
                  </div>
                  <div>
                    <p>Outgoing</p>
                    <strong className="negative">
                      {formatCurrency(transactionTotals.expense)}
                    </strong>
                  </div>
                </div>
              </article>

              <article className="panel activity">
                <div className="panel__header">
                  <h2>Recent activity</h2>
                  <span>Your latest entries</span>
                </div>
                <ul>
                  {transactions.slice(0, 4).map((item) => (
                    <li key={item.id}>
                      <div>
                        <strong>{item.description}</strong>
                        <p>{formatDate(item.occurredAt)}</p>
                      </div>
                      <span
                        className={`amount ${
                          item.type === 'EXPENSE' ? 'negative' : 'positive'
                        }`}
                      >
                        {item.type === 'EXPENSE' ? '-' : '+'}
                        {formatCurrency(item.amount)}
                      </span>
                    </li>
                  ))}
                  {transactions.length === 0 && (
                    <li>
                      <p>No activity yet. Add your first transaction below.</p>
                    </li>
                  )}
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

            <section className="panel transaction-form">
              <h2>Log new activity</h2>
              <form onSubmit={handleTransactionSubmit}>
                <label>
                  <span>Description</span>
                  <input
                    required
                    value={txForm.description}
                    onChange={(event) =>
                      setTxForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                  />
                </label>
                <div className="form-row">
                  <label>
                    <span>Amount (USD)</span>
                    <input
                      required
                      type="number"
                      min="1"
                      value={txForm.amount}
                      onChange={(event) =>
                        setTxForm((prev) => ({
                          ...prev,
                          amount: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    <span>Type</span>
                    <select
                      value={txForm.type}
                      onChange={(event) =>
                        setTxForm((prev) => ({
                          ...prev,
                          type: event.target.value as 'INCOME' | 'EXPENSE',
                        }))
                      }
                    >
                      <option value="INCOME">Income</option>
                      <option value="EXPENSE">Expense</option>
                    </select>
                  </label>
                  <label>
                    <span>Date</span>
                    <input
                      type="date"
                      value={txForm.occurredAt}
                      onChange={(event) =>
                        setTxForm((prev) => ({
                          ...prev,
                          occurredAt: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                {txError && <p className="auth-error">{txError}</p>}
                <p className="helper-text">
                  All amounts are saved in USD. Leave date empty to use today.
                </p>
                <button className="primary" type="submit" disabled={txBusy}>
                  {txBusy ? 'Saving…' : 'Add transaction'}
                </button>
              </form>
            </section>

            <section className="panel transactions-table">
              <div className="panel__header">
                <h2>All activity</h2>
                <div className="export-controls">
                  <input
                    type="date"
                    value={exportRange.from}
                    onChange={(event) =>
                      setExportRange((prev) => ({
                        ...prev,
                        from: event.target.value,
                      }))
                    }
                    placeholder="From"
                  />
                  <input
                    type="date"
                    value={exportRange.to}
                    onChange={(event) =>
                      setExportRange((prev) => ({
                        ...prev,
                        to: event.target.value,
                      }))
                    }
                    placeholder="To"
                  />
                  <button
                    type="button"
                    className="ghost"
                    onClick={handleExport}
                    disabled={exportBusy}
                  >
                    {exportBusy ? 'Exporting…' : 'Export PDF'}
                  </button>
                  <span>{transactions.length} entries</span>
                </div>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td>{transaction.description}</td>
                        <td>{formatDate(transaction.occurredAt)}</td>
                        <td>{transaction.type}</td>
                        <td
                          className={
                            transaction.type === 'EXPENSE'
                              ? 'negative'
                              : 'positive'
                          }
                        >
                          {transaction.type === 'EXPENSE' ? '-' : '+'}
                          {formatCurrency(transaction.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
