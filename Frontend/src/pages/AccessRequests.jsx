import React, { useEffect, useState } from "react"
import { useAuth } from "../auth/useAuth"

const BACKEND_URL = "http://127.0.0.1:8000"

export default function AccessRequests() {
  const { user, loading } = useAuth()
  const [requests, setRequests] = useState([])
  const [fetching, setFetching] = useState(true)

  async function fetchRequests() {
    try {
      const token = await user.getIdToken()

      const res = await fetch(`${BACKEND_URL}/access/my-requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        throw new Error("Failed to fetch requests")
      }

      const data = await res.json()
      setRequests(data || [])
    } catch (err) {
      console.error("Failed to fetch requests", err)
    } finally {
      setFetching(false)
    }
  }

  async function respond(request_id, action) {
    try {
      const token = await user.getIdToken()

      const res = await fetch(`${BACKEND_URL}/access/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          request_id,
          action,
        }),
      })

      if (!res.ok) {
        throw new Error(`Failed to ${action} request`)
      }

      // Remove from UI after action
      setRequests(prev => prev.filter(r => r._id !== request_id))
    } catch (err) {
      console.error("Failed to respond", err)
      alert(`Failed to ${action}: ${err.message}`)
    }
  }

  useEffect(() => {
    if (user) fetchRequests()
  }, [user])

  if (loading || fetching) {
    return <div className="card">Loading access requests…</div>
  }

  return (
    <div className="card" style={{ maxWidth: 800 }}>
      <h3>Access Requests</h3>
      <p className="small-muted">
        Hospitals requesting access to your medical data
      </p>

      {requests.length === 0 && (
        <div className="small-muted">No pending access requests</div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {requests.map(req => (
          <div
            key={req._id}
            className="card"
            style={{
              padding: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <strong>Access Request</strong>
              <div className="small-muted">Hospital ID: {req.hospital_uid}</div>
              <div className="small-muted">Requested: {req.created_at ? new Date(req.created_at).toLocaleDateString() : 'Unknown date'}</div>
              <div className="small-muted">Status: {req.status || 'pending'}</div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn-primary"
                onClick={() => respond(req._id, "approve")}
              >
                Approve
              </button>
              <button
                className="btn-secondary"
                onClick={() => respond(req._id, "reject")}
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
