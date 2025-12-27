import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "../firebase/firebase"


// This Login page uses illustration images from src/assets — copy your provided assets there.
export default function Login(){
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState('Patient')

  return (
    <div style={{padding:28}}>
      <div className="card login-split">
        <div className="login-left">
          {/* Illustration: place image in src/assets with the exact filename below */}
          <img src="/src/assets/illustration.png" alt="illustration" />
        </div>

        <div className="login-right">
          <div className="login-card">
            <h2 style={{marginTop:0}}>Login</h2>
            <div className="toggle-role">
              <button onClick={()=>setRole('Patient')} className={role==='Patient'? 'active':''}>Patient</button>
              <button onClick={()=>setRole('Hospital')} className={role==='Hospital'? 'active':''}>Hospital</button>
            </div>

            <div className="form-row"><label>Email</label><input className="input" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)}/></div>
            <div className="form-row"><label>Password <small style={{float:'right'}}><a className="link-secondary" href="#">Forgot password?</a></small></label><input className="input" type="password" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)}/></div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="btn-primary"
                style={{ flex: 1 }}
                disabled={loading}
                onClick={async () => {
                  setError("")

                  if (!email || !password) {
                    setError("Email and password are required")
                    return
                  }

                  try{
                    setLoading(true)

                    const userCredential = await signInWithEmailAndPassword(
                      auth,
                      email,
                      password
                    )
                    /* Allow Login (due to gmail issues)
                    if(!userCredential.user.emailVerified){
                      setError("Please verify your email before logging in")
                      return
                    }*/
                    if (!userCredential.user.emailVerified) {
                      console.warn("User email not verified")
                    }

                    // Get Firebase ID token
                    const token = await userCredential.user.getIdToken()

                    // Call backend /me
                    const response = await fetch("http://127.0.0.1:8000/me", {
                      method: "GET",
                      headers: {
                        Authorization: `Bearer ${token}`,
                      },
                    })

                    if (!response.ok) {
                      throw new Error("Backend authentication failed")
                    }

                    const data = await response.json()
                    console.log("Backend /me response:", data)
                    navigate ("/dashboard")
                    // backend /me call to be added
                  } catch(err){
                    setError(err.message)
                  } finally {
                    setLoading(false)
                  }                  
                }}
              >
                Login</button>
            </div>

            <div style={{marginTop:12, textAlign:'center'}}>
              <small className="small-muted">No account? <Link to="/register">Register</Link></small>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
