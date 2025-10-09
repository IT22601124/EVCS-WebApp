import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { getUser, getCurrentUser } from '../services/users'
import { listStations } from '../services/stations'
import { getAssignments } from '../services/operatorAssignments'
import { listBookingsAggregate } from '../services/bookings'
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
        const s = await listStations()
        setStations(s || [])
      }catch(e){ console.error(e); toast.error('Failed to load stations') }
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
        // Operators should call the non-admin endpoint only
        const u = await getCurrentUser()
        const assigned = u?.assignedStationId ?? u?.AssignedStationId ?? null
        if(assigned && mounted){
          setAssignedStationId(assigned)
        }
      }catch(e){ 
        // if fetching current user fails, mark it for debugging but don't call admin-only endpoints
        console.debug('Failed to fetch current user for assignment resolution', e)
        setUserFetchForbidden(true)
      }
    }
    fetchAssigned()
    return ()=>{ mounted = false }
  }, [username, loading])

  // Load bookings for myStation (server-side fetch)
  useEffect(()=>{
    let mounted = true
    async function loadBookings(){
      if(!username || loading) return
      try{
        // prefer explicit assignedStationId, otherwise check frontend assignments
        const assigned = assignedStationId ? [assignedStationId] : Object.entries(getAssignments()).filter(([sid,u])=> Array.isArray(u) ? u.includes(username) : u===username).map(([sid])=>sid)
        if(assigned.length === 0){ setBookings([]); return }
        const jobs = assigned.map(sid => listBookingsAggregate({ stationId: sid }).catch(()=>[]))
        const results = await Promise.all(jobs)
        if(mounted) setBookings(results.flat())
      }catch(e){ console.error(e) }
    }
    loadBookings()
    return ()=>{ mounted = false }
  }, [username, loading, assignedStationId])

  const myBookings = useMemo(()=>{
    if(!myStation) return []
    return (bookings || []).filter(b => (b.stationId === myStation.id) || (b.StationId === myStation.id))
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
          <div className="bg-white border rounded p-6 text-slate-500">
            <div className="mb-2">You are not assigned to a station.</div>
            <div className="text-sm text-slate-600">Ask an administrator to assign you, or request assignment below.</div>
            <div className="mt-4">
              <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={()=>{toast('Request sent to admin (simulated)');}}>Request assignment</button>
            </div>
          </div>
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
          <div className="bg-white border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Upcoming Bookings for this Station</h3>
              <div className="text-sm text-slate-500">Count: {myBookings.length}</div>
            </div>
            {myBookings.length===0 ? (
              <div className="text-sm text-slate-500">No bookings found for this station.</div>
            ) : (
              <div className="space-y-3">
                {myBookings.map(b => (
                  <div key={b.id} className="border rounded p-3">
                    <div className="flex justify-between">
                      <div>
                        <div className="font-medium">{b.nic || b.Nic || b.ownerNIC}</div>
                        <div className="text-xs text-slate-500">{(b.date||b.Date) + ' ' + (b.start||b.Start) + ' - ' + (b.end||b.End)}</div>
                      </div>
                      <div className="text-sm text-amber-600">{b.status || b.Status || 'Pending'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
