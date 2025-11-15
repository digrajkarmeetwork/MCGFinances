import { useEffect, useState } from 'react'
import './App.css'

type Summary = {
  cashOnHand: number
  monthlyBurn: number
  runwayMonths: number
  updatedAt: string
}

const currency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

function App() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/summary')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Network response was not ok')
        }
        return res.json()
      })
      .then((data: Summary) => {
        setSummary(data)
      })
      .catch((err) => {
        setError(err.message)
      })
  }, [])

  return (
    <div className="app">
      <header>
        <h1>MCGFinances</h1>
        <p>Realtime visibility into your small business cash flow</p>
      </header>

      {error && (
        <div className="panel error">
          <p>Unable to load summary: {error}</p>
        </div>
      )}

      {!summary && !error && (
        <div className="panel loading">
          <p>Loading insights...</p>
        </div>
      )}

      {summary && (
        <section className="grid">
          <article className="panel">
            <h2>Cash On Hand</h2>
            <p className="value">{currency(summary.cashOnHand)}</p>
          </article>
          <article className="panel">
            <h2>Monthly Burn</h2>
            <p className="value">{currency(summary.monthlyBurn)}</p>
          </article>
          <article className="panel">
            <h2>Runway</h2>
            <p className="value">
              {summary.runwayMonths.toFixed(1)} months
            </p>
          </article>
        </section>
      )}

      {summary && (
        <footer>
          Last updated {new Date(summary.updatedAt).toLocaleString()}
        </footer>
      )}
    </div>
  )
}

export default App
