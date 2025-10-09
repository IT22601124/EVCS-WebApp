import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getStation, createStation, updateStation } from '../services/stations'
import toast from 'react-hot-toast'
import { useRef } from 'react'

export default function StationForm(){
  const { id } = useParams()
  const nav = useNavigate()
  const editing = !!id
  const [form,setForm] = useState({ name:'', address:'', latitude:'', longitude:'', type:'AC', slots:4 })
  const [errors,setErrors] = useState({})
  const [saving,setSaving] = useState(false)
  // Load station when editing and notify the map to move marker to loaded coords
  useEffect(()=>{
    if(editing){
      getStation(id).then(s => {
        setForm(s)
        // after inputs render, ask the injected map to move the marker
        setTimeout(()=>{ try{ window.dispatchEvent(new Event('station:geocode')) }catch(e){} },50)
      })
    }
  },[id])

  // Listen for marker drag events emitted by the injected Leaflet script and update React state
  useEffect(()=>{
    const onMarker = (e) => {
      const { lat, lng } = e.detail || {}
      if(lat !== undefined && lng !== undefined){
        setForm(f=>({ ...f, latitude: lat, longitude: lng }))
      }
    }
    window.addEventListener('station:marker', onMarker)
    return ()=> window.removeEventListener('station:marker', onMarker)
  }, [])
  const save = async (e)=>{
    e.preventDefault()
    // client-side validation
    const v = validate(form)
    setErrors(v)
    if(Object.keys(v).length>0) return

    setSaving(true)
    try{
      console.debug('[stations] save payload', form)
      // ensure lat/long are numbers when sending to the server
      const payload = { ...form, latitude: Number(form.latitude), longitude: Number(form.longitude) }
      if(editing) await updateStation(id, payload)
      else await createStation(payload)
      toast.success('Station saved')
      // navigate back to the stations list under /app
      nav('/app/stations')
    }catch(err){
      console.error('Failed to save station', err, err?.response?.data)
      const msg = err?.response?.data?.message || err?.response?.data || err.message || 'Failed to save station'
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg))
    }finally{
      setSaving(false)
    }
  }
  return (
    <form onSubmit={save} className="max-w-xl space-y-3">
      <h1 className="text-xl font-semibold">{editing?'Edit Station':'New Station'}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="col-span-1">
          <label className="block text-sm font-medium">Name</label>
          <input className="border rounded px-3 py-2 w-full" placeholder="Name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
          {errors.name && <div className="text-red-600 text-sm mt-1">{errors.name}</div>}
        </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium">Type</label>
          <select className="border rounded px-3 py-2 w-full" value={form.type} onChange={e=>setForm({...form, type:e.target.value})}>
            <option>AC</option><option>DC</option>
          </select>
          {errors.type && <div className="text-red-600 text-sm mt-1">{errors.type}</div>}
        </div>

        <div className="col-span-1 sm:col-span-2">
          <label className="block text-sm font-medium">Address</label>
          <input className="border rounded px-3 py-2 w-full" placeholder="Address" value={form.address} onChange={e=>setForm({...form, address:e.target.value})}/>
          {errors.address && <div className="text-red-600 text-sm mt-1">{errors.address}</div>}
        </div>
          <div className="col-span-1 sm:col-span-2">
            <label className="block text-sm font-medium">Location</label>
            <div className="border rounded overflow-hidden">
              <div id="station-map" style={{ height: 320 }}></div>
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Latitude</label>
                  <input className="border rounded px-3 py-2 w-full" placeholder="Latitude" type="number" step="any" value={form.latitude} onChange={e=>setForm({...form, latitude: e.target.value})}/>
                  {errors.latitude && <div className="text-red-600 text-sm mt-1">{errors.latitude}</div>}
                </div>
                <div>
                  <label className="text-xs text-slate-500">Longitude</label>
                  <input className="border rounded px-3 py-2 w-full" placeholder="Longitude" type="number" step="any" value={form.longitude} onChange={e=>setForm({...form, longitude: e.target.value})}/>
                  {errors.longitude && <div className="text-red-600 text-sm mt-1">{errors.longitude}</div>}
                </div>
              </div>
              <div className="p-3 border-t bg-slate-50 flex items-center gap-2">
                <button type="button" className="text-sm underline" onClick={()=>{ // try browser geolocation
                  if(!navigator.geolocation){ toast.error('Geolocation not supported') ; return }
                  navigator.geolocation.getCurrentPosition(pos=>{
                    setForm(f=>({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }))
                  }, err=>{ toast.error('Geolocation failed: '+err.message) })
                }}>Use my location</button>
                <div className="text-sm text-slate-500 ml-auto">Drag the marker to set exact location</div>
              </div>
            </div>
          </div>

        <div className="col-span-1">
          <label className="block text-sm font-medium">Slots</label>
          <input className="border rounded px-3 py-2 w-full" type="number" placeholder="Slots" value={form.slots} onChange={e=>setForm({...form, slots:Number(e.target.value)})}/>
          {errors.slots && <div className="text-red-600 text-sm mt-1">{errors.slots}</div>}
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button className="bg-blue-600 text-white px-3 py-2 rounded disabled:opacity-50" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        <button type="button" className="border px-3 py-2 rounded" onClick={()=>nav('/app/stations')}>Cancel</button>
        <button type="button" className="ml-auto text-sm text-slate-500 underline" onClick={()=>{
          // autofill example data for faster testing
          setForm({ name:'New Station', address:'1 Test St', latitude:6.9271, longitude:79.8612, type:'AC', slots:4 })
        }}>Auto-fill</button>
      </div>
    </form>
  )
}

  // init Leaflet map via side-effect when the form renders; use a lightweight CDN approach so no new deps required
  // This code will only run in the browser (guarded by window existence)
  try{
    if(typeof window !== 'undefined' && !window.__station_map_inited){
      window.__station_map_inited = true
      // inject CSS
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
      // load script
      const s = document.createElement('script')
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      s.onload = ()=>{
        // wait a tick for React to mount the map div
        setTimeout(()=>{
          const el = document.getElementById('station-map')
          if(!el) return
          try{
            const L = window.L
            const map = L.map('station-map').setView([6.9271,79.8612], 13)
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
              maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
            }).addTo(map)
            const marker = L.marker([6.9271,79.8612], { draggable: true }).addTo(map)
            // when marker moves, update inputs
            marker.on('dragend', ()=>{
              const p = marker.getLatLng()
              // set inputs by dispatching a custom event; components can read from window.form if necessary
              const ev = new CustomEvent('station:marker', { detail: { lat: p.lat, lng: p.lng } })
              window.dispatchEvent(ev)
            })
            // listen for geocode or input changes to move marker
            window.addEventListener('station:geocode', ()=>{
              // read current inputs
              const lat = parseFloat(document.querySelector('input[placeholder="Latitude"]').value) || 6.9271
              const lng = parseFloat(document.querySelector('input[placeholder="Longitude"]').value) || 79.8612
              marker.setLatLng([lat,lng]); map.setView([lat,lng], 14)
            })
            // when latitude/longitude inputs change, move marker (use input 'change' event)
            const latInput = document.querySelector('input[placeholder="Latitude"]')
            const lngInput = document.querySelector('input[placeholder="Longitude"]')
            if(latInput && lngInput){
              latInput.addEventListener('change', ()=>{ const lat=parseFloat(latInput.value); const lng=parseFloat(lngInput.value); if(!isNaN(lat)&&!isNaN(lng)){ marker.setLatLng([lat,lng]); map.setView([lat,lng], 14) } })
              lngInput.addEventListener('change', ()=>{ const lat=parseFloat(latInput.value); const lng=parseFloat(lngInput.value); if(!isNaN(lat)&&!isNaN(lng)){ marker.setLatLng([lat,lng]); map.setView([lat,lng], 14) } })
            }
            // propagate marker events back to React via custom event
            window.addEventListener('station:marker', e=>{
              const { lat, lng } = e.detail
              // find React-controlled inputs and set their values and dispatch input event so React picks it up
              const latIn = document.querySelector('input[placeholder="Latitude"]')
              const lngIn = document.querySelector('input[placeholder="Longitude"]')
              if(latIn && lngIn){ latIn.value = lat; lngIn.value = lng; latIn.dispatchEvent(new Event('input',{ bubbles:true })); lngIn.dispatchEvent(new Event('input',{ bubbles:true })); }
            })
          }catch(err){ console.error('failed to init leaflet map', err) }
        },200)
      }
      document.body.appendChild(s)
    }
  }catch(e){ console.debug('map init error', e) }

function validate(f){
  const e = {}
  if(!f.name || f.name.trim().length<2) e.name = 'Name is required (min 2 chars)'
  if(!f.address || f.address.trim().length<3) e.address = 'Address is required'
  if(f.latitude === '' || isNaN(Number(f.latitude))) e.latitude = 'Latitude is required'
  if(f.longitude === '' || isNaN(Number(f.longitude))) e.longitude = 'Longitude is required'
  if(!f.type) e.type = 'Type is required'
  if(!Number.isFinite(Number(f.slots)) || Number(f.slots) < 1) e.slots = 'Slots must be 1 or more'
  return e
}

