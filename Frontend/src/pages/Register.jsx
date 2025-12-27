import React from 'react'
import { UserPlus } from 'lucide-react'

export default function Register(){
  return (
    <div className="register-card card">
      <h2 style={{marginTop:0}}><UserPlus size={18}/> Create account</h2>

      <div className="register-grid" style={{marginTop:12}}>
        <div>
          <label>Full name</label>
          <input className="input" />
        </div>
        <div>
          <label>Phone (optional)</label>
          <input className="input" />
        </div>

        <div>
          <label>Email</label>
          <input className="input" />
        </div>
        <div>
          <label>Gender</label>
          <select className="input"><option value="">Prefer not to say</option><option>Female</option><option>Male</option></select>
        </div>

        <div>
          <label>Password</label>
          <input className="input" type="password" />
        </div>
        <div>
          <label>Confirm password</label>
          <input className="input" type="password" />
        </div>

        <div className="full">
          <label>Allergies / Notes</label>
          <textarea className="input" rows={3}></textarea>
        </div>
      </div>

      <div className="register-cta">
        <button className="btn-ghost">Cancel</button>
        <button className="btn-primary">Create account</button>
      </div>
    </div>
  )
}
