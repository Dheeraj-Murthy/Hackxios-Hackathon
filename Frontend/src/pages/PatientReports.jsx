import React from "react"
import PreviousReports from "./PreviousReports"
import { useParams } from "react-router-dom"

export default function HospitalPatientReports() {
  const { uid } = useParams()

  return <PreviousReports readOnly hospitalView patientUid={uid} />

}
