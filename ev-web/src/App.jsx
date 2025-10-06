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
          <Route index element={<Dashboard />} />

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

          <Route path="stations" element={<Stations />} />
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

          <Route path="bookings" element={<Bookings />} />
          <Route path="bookings/new" element={<BookingForm />} />
          <Route path="bookings/:id" element={<BookingForm />} />
          <Route path="bookings/:id/qr" element={<BookingQR />} />
          <Route path="operator" element={<RequireRole roles={["Operator"]}><OperatorDashboard/></RequireRole>} />
        </Route>
      </Routes>
      <Toaster/>
    </BrowserRouter>
  )
}
