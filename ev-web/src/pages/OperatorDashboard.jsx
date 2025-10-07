import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { getAssignments } from '../services/operatorAssignments'
import { getUser, getCurrentUser } from '../services/users'
import { listStations } from '../services/stations'
import { listBookings } from '../services/bookings'
import toast from 'react-hot-toast'

export default function OperatorDashboard(){
  const { user } = useAuth()
  const username = user?.username

  const [stations, setStations] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [assignedStationId, setAssignedStationId] = useState(null)
  const [userFetchForbidden, setUserFetchForbidden] = useState(false)

  useEffect(()=>{
    async function load(){
      setLoading(true)
      try{
        const [s,b] = await Promise.all([listStations(), listBookings()])
        setStations(s || [])
        setBookings(b || [])
      }catch(e){ console.error(e); toast.error('Failed to load operator dashboard') }
      finally{ setLoading(false) }
    }
    load()
  },[])

  // Only compute myStation after station list has been loaded to avoid showing raw ids
  const myStation = useMemo(()=>{
    if(!username) return null
    if(loading || !stations || stations.length === 0) return null
    // Prefer server-side assignment when available
    if(assignedStationId){
      const s = stations.find(x => x.id === assignedStationId)
      if(s) return s
      // if assignedStationId exists but station not found, still return a fallback object
      return { id: assignedStationId, name: assignedStationId }
    }

    // then check local frontend assignments
    const map = getAssignments()
    let entry = Object.entries(map).find(([sid,u]) => Array.isArray(u) ? u.includes(username) : u===username)
    if(entry){
      const [sid] = entry
      return stations.find(s => s.id === sid) || { id: sid, name: sid }
    }

    // finally, fall back to station.assignedOperator field returned by the server
    if(stations && stations.length){
      const sa = stations.find(s => s.assignedOperator === username)
      if(sa) return sa
    }

    return null
  }, [stations, username, loading, assignedStationId])

  // Read AssignedStationId from the user record and store in state
  useEffect(()=>{
    let mounted = true
    async function fetchAssigned(){
      if(!username || loading) return
      try{
        // try to fetch the user by username (may be admin-only)
        let u = null
        try { u = await getUser(username) } catch(e) { 
          // if forbidden, mark it
          if(e?.raw?.response?.status === 403) setUserFetchForbidden(true)
          u = null 
        }
        // fallback to current user endpoint which should be available to operators
        if(!u){
          try { u = await getCurrentUser() } catch(e) { 
            if(e?.raw?.response?.status === 403) setUserFetchForbidden(true)
            u = null 
          }
        }
        const assigned = u?.assignedStationId ?? u?.AssignedStationId ?? null
        if(assigned && mounted){
          setAssignedStationId(assigned)
        }
      }catch(e){ console.debug('Failed to resolve assignment from user record', e) }
    }
    fetchAssigned()
    return ()=>{ mounted = false }
  }, [username, loading])

  const myBookings = useMemo(()=>{
    if(!myStation) return []
    return (bookings || []).filter(b => b.stationId === myStation.id)
  }, [bookings, myStation])

  // derive slot stats from station and bookings (mocked values if slots missing)
  const stats = useMemo(()=>{
    const total = myStation?.slots ?? 0
    const pending = (myBookings || []).filter(b => b.status === 'Pending').length
    const active = (myBookings || []).filter(b => b.status === 'Approved').length
    const available = Math.max(0, total - active - pending)
    return { total, active, available, pending }
  }, [myStation, myBookings])

  // create dummy slot cards based on slots count
  const slotCards = useMemo(()=>{
    const n = myStation?.slots ?? 0
    const arr = []
    for(let i=1;i<=n;i++){
      const id = `Slot ${i}`
      // simple status mapping for demo: mark first pending as Reserved, others Available
      const status = (i<=stats.pending) ? 'Reserved' : 'Available'
      arr.push({ id, type: myStation?.type || 'DC', status })
    }
    return arr
  }, [myStation, stats])

  if(!username) return <div className="p-6">Please login as an operator</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Station Operator Portal</h1>
          <p className="text-sm text-slate-500">Manage your charging station and monitor slot status</p>
        </div>
      </div>

      {!myStation ? (
        loading ? (
          <div className="bg-white border rounded p-6 text-slate-500">Loading station…</div>
        ) : (
          <div className="bg-white border rounded p-6 text-slate-500">You are not assigned to a station.</div>
        )
      ) : (
        <div className="space-y-4">
          <div className="bg-white border rounded-xl p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">EV Charging Station {myStation.name}</h2>
                <ul className="text-sm text-slate-500 list-disc ml-5 mt-2">
                  <li>{myStation.address ?? 'Unknown location'}</li>
                  <li>{myStation.type ?? 'Type N/A'}</li>
                  <li>Operating Hours: 24/7</li>
                </ul>
              </div>
              <div className="text-sm text-slate-500">{myStation.isActive ? <span className="text-emerald-600">Online</span> : <span className="text-rose-600">Offline</span>}</div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="border rounded p-4 text-center">
                <div className="text-sm text-slate-500">Total Slots</div>
                <div className="text-2xl font-semibold">{stats.total}</div>
              </div>
              <div className="border rounded p-4 text-center">
                <div className="text-sm text-slate-500">Active</div>
                <div className="text-2xl font-semibold text-emerald-600">{stats.active}</div>
              </div>
              <div className="border rounded p-4 text-center">
                <div className="text-sm text-slate-500">Available</div>
                <div className="text-2xl font-semibold text-sky-600">{stats.available}</div>
              </div>
              <div className="border rounded p-4 text-center">
                <div className="text-sm text-slate-500">Pending</div>
                <div className="text-2xl font-semibold text-amber-600">{stats.pending}</div>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Charging Slots Status</h3>
              <div className="text-sm text-slate-500">Date: {new Date().toLocaleDateString()}</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {slotCards.map(s => (
                <div key={s.id} className="border rounded p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{s.id}</div>
                      <div className="text-xs text-slate-500">{s.type} • 50kW</div>
                    </div>
                    <div className={`text-xs px-2 py-1 rounded ${s.status==='Available' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'}`}>{s.status}</div>
                  </div>
                  <div className="mt-3">
                    <button className="border px-3 py-1 rounded text-sm">Set Maintenance</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
