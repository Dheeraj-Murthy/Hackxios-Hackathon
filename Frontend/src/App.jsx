import React from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { Home, FilePlus, Archive, User, LogOut } from 'lucide-react'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import UploadReport from './pages/UploadReport'
import PreviousReports from './pages/PreviousReports'
import ChatButton from './components/ChatButton'
import { signOut } from "firebase/auth"
import { auth } from "./firebase/firebase"
import { useNavigate } from "react-router-dom"



export default function App() {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#0ea5a4" /><path d="M8 12h8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <span>HealthInsight</span>
        </div>

        <nav>
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}><Home size={16} style={{ marginRight: 8 }} /> Dashboard</NavLink>
          <NavLink to="/upload"><FilePlus size={16} style={{ marginRight: 8 }} /> Upload Report</NavLink>
          <NavLink to="/previous"><Archive size={16} style={{ marginRight: 8 }} /> Reports</NavLink>
          <NavLink to="/profile"><User size={16} style={{ marginRight: 8 }} /> Profile</NavLink>
        </nav>

        <div className="logout">
          <button
            className="logout-btn"
            onClick={async () => {
              try {
                await signOut(auth)
                localStorage.clear()
                window.location.href = "/login"
              } catch (err) {
                alert("Logout failed")
              }
            }}
          >
            <LogOut size={14} /> Logout
          </button>

        </div>
      </aside>
      <main className="app-main">

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/upload" element={<UploadReport />} />
          <Route path="/previous" element={<PreviousReports />} />
        </Routes>
      </main>

      <ChatButton />
    </div>
  )
}
