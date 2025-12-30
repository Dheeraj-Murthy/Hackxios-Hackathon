import React, { useEffect, useState } from 'react'
import './reportTile.css'
import AnalysisCard from './AnalysisCard'
import { X, Plus, Star, Trash2, FileText, Activity } from 'lucide-react'

export default function ReportTile({ report, user, onClose, favoriteMarkers, setFavoriteMarkers }) {
  const [biomarkers, setBiomarkers] = useState([])
  const [concernOptions, setConcernOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [newMarkerName, setNewMarkerName] = useState("")

  useEffect(() => {
    if (!report || !report.Report_id) return
    fetchBiomarkers()
  }, [report])

  async function fetchBiomarkers() {
    setLoading(true)
    setError("")
    try {
      const token = user && user.getIdToken ? await user.getIdToken() : null
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/reports/${report.Report_id}/biomarkers`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })

      if (!res.ok) throw new Error('Failed to load biomarkers')
      const data = await res.json()
      setBiomarkers(data.biomarkers || [])
      setConcernOptions(data.concern_options || [])
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function addFavorite(markerName) {
    try {
      const token = user && user.getIdToken ? await user.getIdToken() : null
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/user/favorites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ marker: markerName })
      })
      if (!res.ok) throw new Error('Failed to add favorite')
      const data = await res.json()
      setFavoriteMarkers(data.favorites || [])
    } catch (err) {
      console.error(err)
      alert('Failed to add favorite: ' + err.message)
    }
  }

  async function removeFavorite(markerName) {
    try {
      const token = user && user.getIdToken ? await user.getIdToken() : null
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/user/favorites`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ marker: markerName })
      })
      if (!res.ok) throw new Error('Failed to remove favorite')
      const data = await res.json()
      setFavoriteMarkers(data.favorites || [])
    } catch (err) {
      console.error(err)
      alert('Failed to remove favorite: ' + err.message)
    }
  }

  async function addAttributeToReport() {
    const name = newMarkerName.trim()
    if (!name) return alert('Enter marker name')

    try {
      const token = user && user.getIdToken ? await user.getIdToken() : null
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/reports/${report.Report_id}/attribute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name, value: '', remark: '', range: '', unit: '' })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Failed to add attribute')
      }

      setNewMarkerName('')
      fetchBiomarkers()
      alert(`${name} added to report`) 
    } catch (err) {
      console.error(err)
      alert('Failed to add attribute: ' + err.message)
    }
  }

  return (
    <div className="report-tile-overlay" onClick={onClose}>
      <div className="report-tile" onClick={e => e.stopPropagation()}>
        <div className="report-tile-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ 
                width: 40, 
                height: 40, 
                borderRadius: 10, 
                background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.2)'
            }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Report Details</h2>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                {report.date ? report.date : 'Unknown Date'}
              </div>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="report-tile-body">
          <div className="left-panel">
            <div style={{ padding: '16px 16px 8px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Biomarkers Found
            </div>
            
            <div className="biomarker-list">
              {loading ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Loading biomarkers...</div>
              ) : biomarkers.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>No biomarkers found</div>
              ) : (
                biomarkers.map((b, i) => {
                  const isFav = favoriteMarkers.some(f => f.toLowerCase() === b.name.toLowerCase())
                  return (
                    <div key={i} className="fav-row">
                      <div>
                        <div className="fav-name">{b.name}</div>
                        <div className="fav-value">{b.value} {b.unit}</div>
                      </div>
                      <button 
                        className="btn-link"
                        onClick={() => isFav ? removeFavorite(b.name) : addFavorite(b.name)}
                        title={isFav ? "Remove from favorites" : "Add to favorites"}
                      >
                        {isFav ? <Star size={18} fill="#eab308" color="#eab308" /> : <Star size={18} color="#94a3b8" />}
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            <div className="add-marker">
              <div style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>Add Missing Biomarker</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input 
                  value={newMarkerName}
                  onChange={e => setNewMarkerName(e.target.value)}
                  placeholder="e.g. Vitamin D"
                  style={{ flex: 1 }}
                />
                <button className="btn-primary" onClick={addAttributeToReport}>
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="right-panel">
            {report.analysis ? (
              <div style={{ marginBottom: 32 }}>
                <AnalysisCard 
                  analysis={report.analysis} 
                  favoriteMarkers={favoriteMarkers}
                  onAddFavorite={addFavorite}
                />
              </div>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1', marginBottom: 32 }}>
                <Activity size={32} color="#94a3b8" style={{ marginBottom: 12 }} />
                <p>No AI analysis available for this report.</p>
              </div>
            )}

            <div>
              <h3 style={{ fontSize: 18, marginBottom: 16, color: '#0f172a' }}>Extracted Data</h3>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Biomarker</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Value</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Unit</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 600 }}>Reference Range</th>
                    </tr>
                  </thead>
                  <tbody>
                    {biomarkers.map((b, i) => (
                      <tr key={i} style={{ borderBottom: i !== biomarkers.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                        <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 500 }}>{b.name}</td>
                        <td style={{ padding: '12px 16px', color: '#334155' }}>{b.value}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{b.unit}</td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{b.range}</td>
                      </tr>
                    ))}
                    {biomarkers.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No data extracted</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
