// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import Home from './pages/Home'
import Signup from './pages/Signup'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Owners from './pages/Owners'
import OwnerForm from './pages/OwnerForm'
import Stations from './pages/Stations'
import StationForm from './pages/StationForm'
import Bookings from './pages/Bookings'
import BookingForm from './pages/BookingForm'
import BookingQR from './pages/BookingQR'
import Users from './pages/Users'
import OperatorDashboard from './pages/OperatorDashboard'
import OperatorBookings from './pages/OperatorBookings'
import Schedules from './pages/Schedules'
import { useMemo } from 'react'
import { useAuth } from './auth/useAuth'
import { Navigate } from 'react-router-dom'
import RequireRole from './auth/RequireRole'
import { Toaster } from 'react-hot-toast'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public site */}
        <Route path="/" element={<Home/>} />
        <Route path="/signup" element={<Signup/>} />
        <Route path="/login" element={<Login/>} />

        {/* Protected admin app */}
        <Route
          path="/app"
          element={
            <RequireRole roles={['Backoffice','Operator']}>
              <AppLayout />
            </RequireRole>
          }
        >
            <Route index element={<AppIndex />} />

          <Route
            path="users"
            element={
              <RequireRole roles={['Backoffice']}>
                <Users />
              </RequireRole>
            }
          />

          <Route
            path="owners"
            element={
              <RequireRole roles={['Backoffice']}>
                <Owners />
              </RequireRole>
            }
          />
          <Route
            path="owners/new"
            element={
              <RequireRole roles={['Backoffice']}>
                <OwnerForm />
              </RequireRole>
            }
          />
          <Route
            path="owners/:nic"
            element={
              <RequireRole roles={['Backoffice']}>
                <OwnerForm />
              </RequireRole>
            }
          />

          <Route path="stations" element={<RequireRole roles={['Backoffice']}><Stations /></RequireRole>} />
          <Route
            path="stations/new"
            element={
              <RequireRole roles={['Backoffice']}>
                <StationForm />
              </RequireRole>
            }
          />
          <Route
            path="stations/:id"
            element={
              <RequireRole roles={['Backoffice']}>
                <StationForm />
              </RequireRole>
            }
          />

          <Route path="bookings" element={<RequireRole roles={['Backoffice']}><Bookings /></RequireRole>} />
          <Route path="schedules" element={<RequireRole roles={['Backoffice']}><Schedules /></RequireRole>} />
          <Route path="bookings/new" element={<RequireRole roles={['Backoffice']}><BookingForm /></RequireRole>} />
          <Route path="bookings/:id" element={<RequireRole roles={['Backoffice']}><BookingForm /></RequireRole>} />
          <Route path="bookings/:id/qr" element={<RequireRole roles={['Backoffice']}><BookingQR /></RequireRole>} />
          <Route path="operator" element={<RequireRole roles={["Operator"]}><OperatorDashboard/></RequireRole>} />
          <Route path="operator/bookings" element={<RequireRole roles={["Operator"]}><OperatorBookings/></RequireRole>} />
          {/* Operator station detail moved into OperatorDashboard; no separate route needed */}
        </Route>
      </Routes>
      <Toaster/>
    </BrowserRouter>
  )
}

function AppIndex(){
  // small inline component to choose landing page based on role
  const { role } = useAuth()
  if(role === 'Operator') return <Navigate to="/app/operator" replace />
  return <Dashboard />
}
