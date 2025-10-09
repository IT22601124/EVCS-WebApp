// src/components/AppLayout.jsx
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export default function AppLayout(){
  const { role, user } = useAuth()
  const loc = useLocation()
  const active = (p) => loc.pathname === p ? 'bg-slate-800 text-white' : 'text-slate-200 hover:bg-slate-800'
  const navigate = useNavigate()

  const isOperator = role === 'Operator'
  return (
    <div className="min-h-screen flex bg-slate-50">
      <aside className={`w-64 p-4 space-y-2 ${isOperator ? 'bg-indigo-900' : 'bg-slate-900'}`}>
        <div className="text-xl font-bold text-white mb-4">{isOperator ? 'EVCS Operator' : 'EVCS Admin'}</div>
        {role==='Backoffice' ? (
          <Link to="/app" className={`block px-3 py-2 rounded ${active('/app')}`}>Dashboard</Link>
        ) : (
          <Link to="/app/operator" className={`block px-3 py-2 rounded ${active('/app/operator')}`}>Operator Dashboard</Link>
        )}
  {role==='Backoffice' && <Link to="/app/users" className={`block px-3 py-2 rounded ${active('/app/users')}`}>Users</Link>}
  {role==='Backoffice' && <Link to="/app/owners" className={`block px-3 py-2 rounded ${active('/app/owners')}`}>EV Owners</Link>}
        {role==='Backoffice' ? (
          <>
            <Link to="/app/stations" className={`block px-3 py-2 rounded ${active('/app/stations')}`}>Stations</Link>
            <Link to="/app/bookings" className={`block px-3 py-2 rounded ${active('/app/bookings')}`}>Bookings</Link>
            <Link to="/app/schedules" className={`block px-3 py-2 rounded ${active('/app/schedules')}`}>Schedules</Link>
          </>
        ) : (
          // Operator links
          <>
            <Link to="/app/operator/bookings" className={`block px-3 py-2 rounded ${active('/app/operator/bookings')}`}>My Bookings</Link>
          </>
        )}
        <div className="pt-4 border-t border-slate-700"></div>
        <div className="text-xs text-slate-400">Signed in as <b>{role}</b></div>
        <div className="text-xs text-slate-400 break-words">{user?.username}</div>
        <button
          className="mt-2 px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-white"
          onClick={()=>{localStorage.removeItem('jwt'); localStorage.removeItem('jwt_mock'); navigate('/login', { replace: true })}}
        >Logout</button>
      </aside>
      <main className="flex-1">
        <header className="bg-white border-b p-4">
          <div className="text-lg font-semibold">EV Charging Station Web</div>
        </header>
        <div className="p-4 max-w-6xl mx-auto">
          <Outlet/>
        </div>
      </main>
    </div>
  )
}
