import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth"
import { auth } from "../firebase/firebase"
import { sendPasswordResetEmail } from "firebase/auth"



const Register = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

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
                onClick={async () => {
                  setError("")

                  if (!email || !password || !confirmPassword) {
                    setError("All fields are required")
                    return
                  }

                  if (password.length < 6) {
                    setError("Password must be at least 6 characters")
                    return
                  }

                  if (password !== confirmPassword) {
                    setError("Passwords do not match")
                    return
                  }

                  // Firebase logic 
                  try {
                    setLoading(true)
                    const userCredential = await createUserWithEmailAndPassword(
                      auth,
                      email,
                      password
                    )
                    await sendEmailVerification(userCredential.user, {
                      url: "http://localhost:5173/login",
                      handleCodeInApp: false,
                    })
                    alert("Account created. PLease verify your email.")

                    //navigation will add when backend integrated
                  } catch (err) {
                    setError(err.message)
                  } finally {
                    setLoading(false)
                  }
                }}
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
