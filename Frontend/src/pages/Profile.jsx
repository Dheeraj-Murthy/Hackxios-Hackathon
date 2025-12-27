import React, { useState, useEffect } from 'react'

// Modernized Profile page - stores data in localStorage (demo) and shows avatar + quick stats
export default function Profile(){
  const [profile, setProfile] = useState(()=>{
    try{
      const raw = localStorage.getItem('profile')
      return raw ? JSON.parse(raw) : {height:'170', weight:'70', age:'30', allergies:''}
    } catch(e){ return {height:'170', weight:'70', age:'30', allergies:''} }
  })

  useEffect(()=>{
    // persist to localStorage for demo purposes
    localStorage.setItem('profile', JSON.stringify(profile))
  },[profile])

  function updateField(e){
    const {name, value} = e.target
    setProfile(prev=>({...prev, [name]: value}))
  }

  function onSave(){
    // in a real app, send to backend. Here we persist to localStorage and show a tiny confirmation.
    localStorage.setItem('profile', JSON.stringify(profile))
    alert('Profile saved (demo)')
  }

  const height = Number(profile.height) || 0
  const weight = Number(profile.weight) || 0
  const bmi = height>0 ? (weight / ((height/100)*(height/100))).toFixed(1) : '—'

  return (
    <div className="card" style={{maxWidth:980}}>
      <h2>Profile</h2>
      <p className="small-muted">Upload basic info that will be used by the analysis engine.</p>

      <div className="profile-card" style={{marginTop:16}}>
        <div className="profile-left">
          <div className="profile-avatar">{profile.name ? profile.name.split(' ').map(s=>s[0]).join('').slice(0,2) : 'JD'}</div>

          <div className="profile-stats">
            <div className="stat"><strong>BMI</strong><div className="small-muted">{bmi}</div></div>
            <div className="stat"><strong>Age</strong><div className="small-muted">{profile.age}</div></div>
            <div className="stat"><strong>Weight</strong><div className="small-muted">{profile.weight} kg</div></div>
          </div>
        </div>

        <div className="profile-right">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h3 style={{margin:0}}>Personal details</h3>
            <div style={{display:'flex', gap:8}}>
              <button className="btn-secondary" onClick={()=>{ setProfile({height:'', weight:'', age:'', allergies:''}) }}>Reset</button>
              <button className="btn-primary" onClick={onSave}>Save</button>
            </div>
          </div>

          <div style={{marginTop:14}}>
            <div className="form-grid">
              <div>
                <label>Full name</label>
                <input name="name" value={profile.name||''} onChange={updateField} className="input" />
              </div>
              <div>
                <label>Gender</label>
                <select name="gender" value={profile.gender||''} onChange={updateField} className="input">
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label>Height (cm)</label>
                <input name="height" value={profile.height} onChange={updateField} className="input" />
              </div>
              <div>
                <label>Weight (kg)</label>
                <input name="weight" value={profile.weight} onChange={updateField} className="input" />
              </div>

              <div>
                <label>Age</label>
                <input name="age" value={profile.age} onChange={updateField} className="input" />
              </div>
              <div>
                <label>Blood group</label>
                <input name="blood_group" value={profile.blood_group||''} onChange={updateField} className="input" />
              </div>

              <div className="full">
                <label>Allergies / Notes</label>
                <textarea name="allergies" value={profile.allergies} onChange={updateField} className="input" rows={4} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
