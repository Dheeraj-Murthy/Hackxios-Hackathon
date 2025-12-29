import React, { useState, useEffect } from 'react'
import AnalysisCard from '../components/AnalysisCard'
import { useAuth } from "../auth/useAuth"
import { useParams, useLocation } from "react-router-dom"

export default function PreviousReports({ readOnly, hospitalView, patientUid: propPatientUid }) {
  const { user, loading: authLoading } = useAuth()
  const { uid: urlPatientUid } = useParams()
  const location = useLocation()
  
  const isHospitalView = hospitalView || location.pathname.startsWith("/hospital/patient")
  const readOnlyMode = readOnly || location.state?.readOnly === true
  
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Determine which patient UID to use
  const targetUid = isHospitalView ? (propPatientUid || urlPatientUid) : user?.uid

  useEffect(() => {
    // Wait for auth to load and targetUid to be available
    if (authLoading || !targetUid || (!user && !isHospitalView)) return

    const fetchReports = async () => {
      try {
        if (!user) {
          throw new Error("User not authenticated")
        }
        const token = await user.getIdToken()
        
        const response = await fetch(`http://127.0.0.1:8000/api/reports/patient/${targetUid}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch reports")
        }

        const data = await response.json()
        
        // Fetch LLM analyses for each report
        const reportsWithAnalysis = await Promise.all(
          data.reports.map(async (report) => {
            let analysis = null
            
            if (report.llm_report_id) {
              try {
                const analysisResponse = await fetch(`http://127.0.0.1:8000/api/LLMReport/${report.llm_report_id}`, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                })
                
                if (analysisResponse.ok) {
                  const analysisData = await analysisResponse.json()
                  analysis = analysisData.output
                }
              } catch (err) {
                console.error("Failed to fetch analysis for report:", report._id, err)
              }
            }
            
            return {
              ...report,
              analysis,
              date: report.Processed_at ? new Date(report.Processed_at).toISOString().split('T')[0] : 'Unknown date'
            }
          })
        )
        
        // Sort by date (newest first)
        reportsWithAnalysis.sort((a, b) => new Date(b.date) - new Date(a.date))
        
        setReports(reportsWithAnalysis)

      } catch (err) {
        console.error("Failed to fetch reports:", err)
        setError(err.message || "Failed to load reports")
      } finally {
        setLoading(false)
      }
    }

    fetchReports()
  }, [user, targetUid])

  if (loading) {
    return (
      <div>
        <h2>Previous Reports</h2>
        <div className="card">Loading reports...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h2>Previous Reports</h2>
        <div className="card">
          <div className="error-box">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2>Previous Reports</h2>
      <p className="small-muted">
        {reports.length === 0 ? "No reports uploaded yet" : `Showing ${reports.length} report${reports.length === 1 ? '' : 's'}`}
      </p>
      <div style={{display:'grid', gap:12}}>
        {reports.map(r => (
          <div key={r._id} className="card">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <strong>{r.date}</strong>
              <div className="small-muted">
                {r.analysis?.interpretation ? r.analysis.interpretation.slice(0, 60) + "..." : "No analysis available"}
              </div>
            </div>
            {r.analysis && <AnalysisCard analysis={r.analysis} compact />}
            {!r.analysis && (
              <div className="small-muted" style={{marginTop: 12}}>
                No analysis available for this report
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
