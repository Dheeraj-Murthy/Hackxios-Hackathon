import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { User } from 'lucide-react'

// This Login page uses illustration images from src/assets — copy your provided assets there.
export default function Login(){
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

            <div className="form-row"><label>Email</label><input className="input" type="email" placeholder="name@example.com" /></div>
            <div className="form-row"><label>Password <small style={{float:'right'}}><a className="link-secondary" href="#">Forgot password?</a></small></label><input className="input" type="password" placeholder="••••••" /></div>

            <div style={{display:'flex', gap:8}}>
              <button className="btn-primary" style={{flex:1}}>Login</button>
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
