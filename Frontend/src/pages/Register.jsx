import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth"
import { auth } from "../firebase/firebase"

const BACKEND_URL = "http://localhost:8000"

const Register = () => {
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    setError("")

    if (!email || !password || !confirmPassword) {
      setError("All fields are required")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    try {
      setLoading(true)

      // 1. Firebase signup
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      )

      // 2. Get ID token and uid
      const token = await userCredential.user.getIdToken()

      // 3. Backend onboarding
      const res = await fetch("http://127.0.0.1:8000/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: "",
          Favorites: [],
          Reports: [],
          BioData: {}
        })
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(err)
      }

      const data = await res.json()

      // 4. Store patient_id
      localStorage.setItem("patient_id", data._id)

      // 5. Redirect
      navigate("/dashboard")

    } catch (err) {
      console.error(err)
      setError(err.message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }


  return (
    <div style={{ padding: 28 }}>
      <div className="card login-split">

        {/* LEFT SIDE */}
        <div className="login-left">
          <img src="/src/assets/illustration.png" alt="illustration" />
        </div>

        {/* RIGHT SIDE */}
        <div className="login-right">
          <div className="login-card">
            <h2 style={{ marginTop: 0 }}>Create Account</h2>

            {error && (
              <div className="error-box">
                {error}
              </div>
            )}

            <div className="form-row">
              <label>Email</label>
              <input
                className="input"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-row">
              <label>Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="form-row">
              <label>Confirm Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn-primary"
                style={{ flex: 1 }}
                disabled={loading}
                onClick={handleRegister}
              >
                {loading ? "Creating account..." : "Register"}
              </button>
            </div>

            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <small className="small-muted">
                Already have an account? <Link to="/login">Login</Link>
              </small>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
