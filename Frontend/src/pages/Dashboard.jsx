import React, { useEffect, useState } from 'react'
import AnalysisCard from '../components/AnalysisCard'
import ChartWidget from '../components/ChartWidget'
import { useAuth } from "../auth/useAuth"

const DUMMY_CONCERNED = [
  { name: 'Vitamin D', value: '14 ng/mL' },
  { name: 'Ferritin', value: '25 ng/mL' },
  { name: 'TSH', value: '2.5 μIU/mL' }
]

export default function Dashboard() {

  const { user, loading } = useAuth()
  const [userData, setUserData] = useState(null)
  const [actionableSuggestions, setActionableSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(true)


  useEffect(() => {
    if (!user) return

    const fetchUser = async () => {
      try {
        const token = await user.getIdToken()

        const res = await fetch("http://localhost:8000/user/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) throw new Error("Failed to fetch user")

        const data = await res.json()
        setUserData(data)

      } catch (err) {
        console.error("Dashboard user fetch failed:", err)
      }
    }

    fetchUser()

    const fetchActionableSuggestions = async () => {
    try {
      const token = await user.getIdToken()

      const res = await fetch(
        "http://localhost:8000/dashboard/actionable-suggestions",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!res.ok) throw new Error("Failed to fetch actionable suggestions")

      const data = await res.json()
      setActionableSuggestions(data.actionable_suggestions || [])

    } catch (err) {
      console.error("Failed to load actionable suggestions:", err)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  fetchActionableSuggestions()
  }, [user])

  if (loading) {
    return <div className="card">Loading dashboard...</div>
  }

  return (
    <div>
      <div className="hero">
        <div className="hero-left" style={{ flex: 1 }}>
          <h2>
            Welcome back{userData?.name ? `, ${userData.name}` : ""}!
          </h2>

          <p className="small-muted">
            Based on your latest blood test, your Vitamin D is lower than the optimal range.
            Increasing your Vitamin D intake and getting more sunlight is recommended.
          </p>
        </div>
      </div>

      <h3>Concern Biomarkers</h3>
      <div className="concern-row">
        {DUMMY_CONCERNED.map((c) => (
          <div key={c.name} className="card concern-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{c.name}</strong>
                <div className="small-muted">{c.value}</div>
              </div>
            </div>
            <div style={{ marginTop: 8 }}>
              <ChartWidget biomarker={c.name} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid">
        <div className="card">
          <h3>Actionable Suggestions</h3>
          {loadingSuggestions ? (
            <p className="small-muted">Generating personalized suggestions...</p>
          ) : actionableSuggestions.length === 0 ? (
            <p className="small-muted">No suggestions available yet.</p>
          ) : (
            <ul style={{ marginTop: 12 }}>
              {actionableSuggestions.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ul>
          )}
        </div>


        <div className="card">
          <h3>Detailed Analysis</h3>
          <AnalysisCard
            analysis={{
              interpretation:
                'The report shows elevated fasting glucose and borderline low vitamin D. Hemoglobin within normal range.',
              lifestyle_changes: ['Reduce refined carbs', '30 min brisk walk 5x per week'],
              nutritional_changes: ['Increase vitamin D rich foods', 'Moderate carbohydrate intake'],
              symptom_probable_cause: null,
              next_steps: ['Consult GP for metabolic panel', 'Repeat test in 3 months'],
              concern_options: ['Fasting Glucose', 'Vitamin D', 'HbA1c']
            }}
          />
        </div>
      </div>
    </div>
  )
}
