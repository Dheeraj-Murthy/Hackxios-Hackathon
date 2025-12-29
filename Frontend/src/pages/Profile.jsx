import React, { useState, useEffect } from 'react'
import { sendEmailVerification } from "firebase/auth"
import { useAuth } from "../auth/useAuth"
import { useParams, useLocation } from "react-router-dom"


export default function Profile({ readOnly = false }) {

  //Auth state
  const { uid: patientUid } = useParams()
  const isHospitalView = location.pathname.startsWith("/hospital/patient")


  const { user, loading } = useAuth()

  //Email Verification
  const [email, setEmail] = useState("")
  const [emailVerified, setEmailVerified] = useState(false)
  const [sendingVerification, setSendingVerification] = useState(false)

  const [isEditing, setIsEditing] = useState(false)

  //Profile
  const [profile, setProfile] = useState(() => {
    try {
      const raw = localStorage.getItem("profile")
      return raw ? JSON.parse(raw) : {
        photo: "",
        name: "",
        gender: "",
        age: "",
        height: "",
        weight: "",
        blood_group: "",
        allergies: ""
      }
    } catch {
      return {
        photo: "",
        name: "",
        gender: "",
        age: "",
        height: "",
        weight: "",
        blood_group: "",
        allergies: ""
      }
    }
  })

  useEffect(() => {
    if (readOnly) {
      setIsEditing(false)
    }
  }, [readOnly])

  useEffect(() => {
    localStorage.setItem("profile", JSON.stringify(profile))
  }, [profile])

  useEffect(() => {
    if (!user) return
    if (isHospitalView && !patientUid) return

    const fetchProfileFromBackend = async () => {
      try {
        const token = await user.getIdToken()

        const url = isHospitalView
          ? `http://localhost:8000/hospital/patient/${patientUid}`
          : "http://localhost:8000/user/me"

        const res = await fetch(url, {

          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) {
          throw new Error("Failed to fetch profile")
        }

        const data = await res.json()

        setEmail(data.email || "")
        setEmailVerified(true)

        setProfile({
          photo: data.BioData?.photo || "",
          name: data.name || "",
          gender: data.BioData?.gender || "",
          age: data.BioData?.age || "",
          height: data.BioData?.height || "",
          weight: data.BioData?.weight || "",
          blood_group: data.BioData?.blood_group || "",
          allergies: data.BioData?.allergies || "",
        })


      } catch (err) {
        console.error("PROFILE FETCH FAILED:", err)
      }
    }

    fetchProfileFromBackend()
  }, [user, isHospitalView, patientUid])


  //Completion Wheel
  const REQUIRED_FIELDS = [
    "name",
    "gender",
    "age",
    "height",
    "weight",
    "blood_group",
    "allergies",
  ]

  const filledProfileFields = REQUIRED_FIELDS.filter(
    f => profile[f] && profile[f].toString().trim() !== ""
  ).length

  const totalFields = REQUIRED_FIELDS.length + 1 // + email verification
  const filledTotal = filledProfileFields + (emailVerified ? 1 : 0)

  const completionPercent = Math.round(
    (filledTotal / totalFields) * 100
  )

  const height = Number(profile.height) || 0
  const weight = Number(profile.weight) || 0
  const bmi =
    height > 0 ? (weight / ((height / 100) * (height / 100))).toFixed(1) : "—"

  if (loading) return <div className="card">Loading profile…</div>
  if (!user) return <div className="card">You are not logged in.</div>

  function updateField(e) {
    if (readOnly || !isEditing) return
    const { name, value } = e.target
    setProfile(prev => ({ ...prev, [name]: value }))
  }

  function handlePhotoUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      setProfile(prev => ({ ...prev, photo: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  function removePhoto() {
    setProfile(prev => ({ ...prev, photo: "" }))
  }

  async function onSave() {
    try {
      // 1. Get Firebase ID token
      const token = await user.getIdToken()

      // 2. Call backend to update BioData
      const res = await fetch("http://localhost:8000/user/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      })

      if (!res.ok) {
        throw new Error("Backend update failed")
      }

      // 3. Keep localStorage in sync (optional but good UX)
      localStorage.setItem("profile", JSON.stringify(profile))

      setIsEditing(false)

      alert("Profile saved to backend")
    } catch (err) {
      console.error("SAVE FAILED:", err)
      alert("Failed to save profile")
    }
  }

  //UI
  return (
    <div className="card" style={{ maxWidth: 980 }}>
      <h2>Profile</h2>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <strong>Email:</strong> {email || "—"}
          {emailVerified ? (
            <span style={{ color: "green", marginLeft: 10 }}>Verified</span>
          ) : (
            <button
              className="btn-secondary"
              style={{ marginLeft: 10 }}
              disabled={sendingVerification}
              onClick={async () => {
                try {
                  setSendingVerification(true)
                  await sendEmailVerification(user, {
                    url: "http://localhost:5173/profile",
                    handleCodeInApp: false,
                  })
                  alert("Verification email sent")
                } finally {
                  setSendingVerification(false)
                }
              }}
            >
              Verify Email
            </button>
          )}
        </div>

        <div style={{ position: "relative", width: 70, height: 70 }}>
          <svg width="70" height="70">
            <circle cx="35" cy="35" r="28" stroke="#e5e7eb" strokeWidth="6" fill="none" />
            <circle
              cx="35"
              cy="35"
              r="28"
              stroke={completionPercent === 100 ? "#16a34a" : "#0ea5a4"}
              strokeWidth="6"
              fill="none"
              strokeDasharray={2 * Math.PI * 28}
              strokeDashoffset={2 * Math.PI * 28 * (1 - completionPercent / 100)}
              transform="rotate(-90 35 35)"
              strokeLinecap="round"
            />
          </svg>
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 600
          }}>
            {completionPercent}%
          </div>
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-left">

          <div style={{ textAlign: "center" }}>
            <label style={{ cursor: isEditing ? "pointer" : "default" }}>
              <div className="profile-avatar" style={{ overflow: "hidden" }}>
                {profile.photo ? (
                  <img
                    src={profile.photo}
                    alt="Profile"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  profile.name
                    ? profile.name.split(" ").map(s => s[0]).join("").slice(0, 2)
                    : "JD"
                )}
              </div>

              {isEditing && (
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handlePhotoUpload}
                />
              )}
            </label>

            {isEditing && profile.photo && (
              <button
                className="btn-secondary"
                style={{ marginTop: 6 }}
                onClick={removePhoto}
              >
                Remove photo
              </button>
            )}
          </div>


          <div className="profile-stats">
            <div className="stat"><strong>BMI</strong><div>{bmi}</div></div>
            <div className="stat"><strong>Age</strong><div>{profile.age || "—"}</div></div>
            <div className="stat"><strong>Weight</strong><div>{profile.weight || "—"} kg</div></div>
          </div>
        </div>

        <div className="profile-right">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <h3>Personal details</h3>
            {isEditing ? (
              <button
                className="btn-primary"
                disabled={readOnly}
                onClick={onSave}
              >
                Save
              </button>
            ) : (
              <button
                className="btn-secondary"
                disabled={readOnly}
                onClick={() => setIsEditing(true)}
              >
                Edit
              </button>
            )}
          </div>

          <div className="form-grid">
            <div>
              <label>Full name</label>
              <input disabled={!isEditing} name="name" value={profile.name} onChange={updateField} className="input" />
            </div>

            <div>
              <label>Gender</label>
              <select disabled={!isEditing} name="gender" value={profile.gender} onChange={updateField} className="input">
                <option value="">Select</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label>Height (cm)</label>
              <input disabled={!isEditing} name="height" value={profile.height} onChange={updateField} className="input" />
            </div>

            <div>
              <label>Weight (kg)</label>
              <input disabled={!isEditing} name="weight" value={profile.weight} onChange={updateField} className="input" />
            </div>

            <div>
              <label>Age</label>
              <input disabled={!isEditing} name="age" value={profile.age} onChange={updateField} className="input" />
            </div>

            <div>
              <label>Blood group</label>
              <input disabled={!isEditing} name="blood_group" value={profile.blood_group} onChange={updateField} className="input" />
            </div>

            <div className="full">
              <label>Allergies / Notes</label>
              <textarea disabled={!isEditing} name="allergies" value={profile.allergies} onChange={updateField} className="input" rows={4} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
