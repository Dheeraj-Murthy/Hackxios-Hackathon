import React from "react"
import { useParams } from "react-router-dom"

export default function HospitalPatient() {
  const { id } = useParams()

  return (
    <div>
      <h2>Patient Details</h2>
      <p className="small-muted">Patient ID: {id}</p>

      <div className="card" style={{ marginTop: 16 }}>
        <p>Patient reports and analysis will appear here.</p>
      </div>
    </div>
  )
}
