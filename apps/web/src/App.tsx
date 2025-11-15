import { useEffect, useMemo, useState } from 'react'
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

  const summaryUrl = useMemo(() => {
    const suffix = '/api/v1/summary'
    const apiBase = resolveApiBase()
    if (!apiBase) {
      return suffix
    }
    try {
      return new URL(suffix, `${apiBase}/`).toString()
    } catch {
      return `${apiBase}${suffix}`
    }
  }, [])

  const loadSummary = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(summaryUrl)
      if (!response.ok) {
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
  }

  useEffect(() => {
    loadSummary()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
            <button className="ghost">Support</button>
            <button className="primary">Add account</button>
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
          <button className="refresh" onClick={loadSummary} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh data'}
          </button>
        </header>

        {error && (
          <div className="panel error">
            <strong>Unable to load summary.</strong> {error}
          </div>
        )}

        {loading && !summary && !error && (
          <div className="panel loading">
            <div className="dots">
              <span />
              <span />
              <span />
            </div>
            <p>Syncing with your bank feeds…</p>
          </div>
        )}

        {summary && (
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
          {summary ? (
            <p>
              Last updated {new Date(summary.updatedAt).toLocaleString()} ·
              synced nightly & on demand.
            </p>
          ) : (
            <p>Connect your first bank account to unlock insights.</p>
          )}
        </footer>
      </main>
    </div>
  )
}

export default App
