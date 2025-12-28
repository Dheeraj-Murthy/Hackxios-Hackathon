import React from 'react'
import { Routes, Route, NavLink, Outlet } from 'react-router-dom'
import { Home, FilePlus, Archive, User, LogOut } from 'lucide-react'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import UploadReport from './pages/UploadReport'
import PreviousReports from './pages/PreviousReports'
import ChatButton from './components/ChatButton'
import HospitalDashboard from "./pages/HospitalDashboard"
import HospitalPatient from "./pages/HospitalPatient"
import AccessRequests from "./pages/AccessRequests"
import { signOut } from "firebase/auth"
import { auth } from "./firebase/firebase"
import { useNavigate } from "react-router-dom"


//Patient Pages
function PatientLayout() {
  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <div className="logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" fill="#0ea5a4" />
            <path d="M8 12h8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>HealthInsight</span>
        </div>

        <nav>
          <NavLink to="/dashboard" className={({ isActive }) => isActive ? "active" : ""}>
            <Home size={16} style={{ marginRight: 8 }} /> Dashboard
          </NavLink>

          <NavLink to="/upload">
            <FilePlus size={16} style={{ marginRight: 8 }} /> Upload Report
          </NavLink>

          <NavLink to="/previous">
            <Archive size={16} style={{ marginRight: 8 }} /> Reports
          </NavLink>

          <NavLink to="/profile">
            <User size={16} style={{ marginRight: 8 }} /> Profile
          </NavLink>
        </nav>

        <div className="logout">
          <button
            className="logout-btn"
            onClick={async () => {
              try {
                await signOut(auth)
                localStorage.clear()
                window.location.href = "/login"
              } catch {
                alert("Logout failed")
              }
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>

      <ChatButton />
    </div>
  )
}

// Hospital Layouts
function HospitalLayout() {
  return (
    <div style={{ padding: 28 }}>
      <Outlet />
    </div>
  )
}

//Routes
export default function App() {
  return (
    <Routes>
      <Route path="/" element= {<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<PatientLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/upload" element={<UploadReport />} />
        <Route path="/previous" element={<PreviousReports />} />
        <Route path="/access-requests" element={<AccessRequests />} />
      </Route>

      <Route element={<HospitalLayout />}>
        <Route path="/hospital" element={<HospitalDashboard />} />
        <Route path="/hospital/patient/:id" element={<HospitalPatient />} />
      </Route>

    </Routes>
  )
}
