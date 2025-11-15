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

const apiBase = (import.meta.env.VITE_API_URL as string | undefined)?.replace(
  /\/$/,
  '',
)

function App() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const summaryUrl = useMemo(() => {
    const suffix = '/api/v1/summary'
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

  const cards = summary
    ? [
        {
          label: 'Cash On Hand',
          value: formatCurrency(summary.cashOnHand),
          tone: 'positive',
        },
        {
          label: 'Monthly Burn',
          value: formatCurrency(summary.monthlyBurn),
          tone: 'warning',
        },
        {
          label: 'Runway',
          value: `${summary.runwayMonths.toFixed(1)} months`,
          tone: 'neutral',
        },
      ]
    : []

  return (
    <div className="page">
      <main className="container">
        <header className="hero">
          <div>
            <p className="eyebrow">MCGFinances</p>
            <h1>Know your cash position at any moment</h1>
            <p className="lead">
              Connect bank feeds, categorize spend, and keep a constant pulse on
              burn, runway, and profitability.
            </p>
          </div>
          <button className="refresh" onClick={loadSummary} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh data'}
          </button>
        </header>

        {error && (
          <div className="panel error">
            <strong>Unable to load summary:</strong> {error}
          </div>
        )}

        {loading && !summary && !error && (
          <div className="panel loading">
            <p>Loading insights…</p>
          </div>
        )}

        {summary && (
          <>
            <section className="grid">
              {cards.map((card) => (
                <article key={card.label} className={`panel ${card.tone}`}>
                  <p className="label">{card.label}</p>
                  <p className="value">{card.value}</p>
                </article>
              ))}
            </section>

            <section className="diagnostics panel">
              <div>
                <h2>Need-to-know metrics</h2>
                <p>
                  Stay under {formatCurrency(summary.monthlyBurn)} in monthly
                  burn to preserve the {summary.runwayMonths.toFixed(1)} months
                  of runway shown here. Keep cash &gt; runway target to avoid
                  shortfalls.
                </p>
              </div>
              <ul>
                <li>
                  <span className="tag healthy" />
                  Cash is updated in near real-time from your financial
                  institutions.
                </li>
                <li>
                  <span className="tag caution" />
                  Watch spend spikes—set alerts inside the platform.
                </li>
                <li>
                  <span className="tag info" />
                  Export full reports and collaborate with advisors directly.
                </li>
              </ul>
            </section>
          </>
        )}

        <footer className="footer">
          <p>
            {summary
              ? `Last updated ${new Date(
                  summary.updatedAt,
                ).toLocaleString()}`
              : 'Connect your accounts to unlock cash visibility.'}
          </p>
        </footer>
      </main>
    </div>
  )
}

export default App
