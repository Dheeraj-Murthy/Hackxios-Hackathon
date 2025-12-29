import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../auth/useAuth"
import { logout } from "../auth/logout"

export default function HospitalDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [patientEmail, setPatientEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [patients, setPatients] = useState([])
  const [hospitalData, setHospitalData] = useState(null)

  // ================= LOAD HOSPITAL DATA =================
  useEffect(() => {
    async function loadHospitalData() {
      try {
        const token = await user.getIdToken()

        // Get hospital user data to get institution name
        const userRes = await fetch("http://localhost:8000/user/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (userRes.ok) {
          const userData = await userRes.json()
          setHospitalData(userData)
        }
      } catch (err) {
        console.error("Failed to load hospital data:", err)
      }
    }

    // ================= LOAD APPROVED PATIENTS =================
    async function loadPatients() {
      try {
        const token = await user.getIdToken()

        const res = await fetch(
          "http://localhost:8000/hospital/patients",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (!res.ok) throw new Error("Failed to load patients")

        const data = await res.json()
        console.log("Hospital patients response:", data)
        setPatients(data)
      } catch (err) {
        console.error("LOAD PATIENTS ERROR:", err)
      }
    }

    if (user) {
      loadHospitalData()
      loadPatients()
    }
  }, [user])

  // ================= REQUEST ACCESS =================
  async function sendAccessRequest() {
    if (!patientEmail) {
      alert("Enter patient email")
      return
    }

    try {
      setLoading(true)
      const token = await user.getIdToken()

      const res = await fetch("http://localhost:8000/access/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: patientEmail }),
      })

      if (!res.ok) throw new Error("Request failed")

      alert("Access request sent")
      setPatientEmail("")
      setShowModal(false)
    } catch (err) {
      console.error(err)
      alert("Failed to send request")
    } finally {
      setLoading(false)
    }
  }

  // ================= FILTER =================
  const filteredPatients = patients.filter(p =>
    (p.name || "")
      .toLowerCase()
      .includes(search.toLowerCase()) ||
    (p.email || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  return (
    <div>
      {/* ================= HEADER ================= */}
      <div
        className="card"
        style={{
          marginBottom: 20,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Hospital Dashboard</h2>
          <div className="small-muted">
            {hospitalData?.institution_name || "Medical Institution"}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div className="small-muted">Logged in as</div>
          <strong>{user?.email}</strong>

          <div style={{ marginTop: 8 }}>
            <button
              className="btn-secondary"
              onClick={() => logout(navigate)}
            >
              Logout
            </button>
          </div>
        </div>

      </div>

      <p className="small-muted">
        Manage patients and request access
      </p>

      {/* ================= SEARCH + ADD ================= */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input
          className="input"
          placeholder="Search patient by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          Add Patient
        </button>
      </div>

      {/* ================= PATIENT LIST ================= */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filteredPatients.length === 0 && (
          <div className="small-muted">
            No approved patients yet
          </div>
        )}

        {filteredPatients.map((p) => (
          <div
            key={p.uid}
            className="card"
            style={{
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
            onClick={() =>
              navigate(`/hospital/patient/${p.uid}`)
            }
          >
            <div>
              <strong>{p.name || "Unnamed Patient"}</strong>
              <div className="small-muted">{p.email}</div>
            </div>
            <span className="small-muted">View →</span>
          </div>
        ))}
      </div>

      {/* ================= ADD PATIENT MODAL ================= */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="card" style={{ maxWidth: 420 }}>
            <h3>Request Patient Access</h3>

            <input
              className="input"
              placeholder="Patient email"
              value={patientEmail}
              onChange={(e) => setPatientEmail(e.target.value)}
              style={{ marginTop: 12 }}
            />

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 16,
                justifyContent: "flex-end",
              }}
            >
              <button
                className="btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={loading}
                onClick={sendAccessRequest}
              >
                {loading ? "Sending..." : "Send Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
