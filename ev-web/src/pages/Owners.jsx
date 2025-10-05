import { useEffect, useState } from 'react'
import { listOwners, getOwner, deactivateOwner, reactivateOwner, createOwner } from '../services/owners'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function Owners(){
  const [items,setItems]=useState([])
  const [form,setForm] = useState({ nic:'', fullName:'', email:'', phone:'' })
  const [query,setQuery]=useState('')
  const [selected,setSelected]=useState(null) // owner selected for modal
  const [busyNic, setBusyNic] = useState(null)

  const load = async ()=>{
    let items = await listOwners()
    

    // For any item missing human-friendly fields but with an _id, try to fetch a full owner record
    const enhanced = await Promise.all(items.map(async it =>{
      if((!it.FullName || it.FullName === '') && it._raw && (it._raw._id || it._raw.id)){
        try{
          const full = await getOwner(it._raw._id ?? it._raw.id)
          return full ?? it
        }catch(e){
          console.warn('getOwner fallback failed for', it._raw._id ?? it._raw.id, e)
          return it
        }
      }
      return it
    }))

    setItems(enhanced)
  }

  async function onCreate(e){
    e.preventDefault()
    if(!form.nic?.trim() || !form.fullName?.trim()) return toast.error('NIC and Full Name required')
    try{
      await createOwner({ ...form })
      toast.success('Owner created')
      setForm({ nic:'', fullName:'', email:'', phone:'' })
      await load()
    }catch(e){
      console.error(e)
      toast.error('Failed to create owner')
    }
  }

  useEffect(()=>{ load() },[])

  function norm(o){
    return {
      nic: o?.Nic ?? o?.nic,
      fullName: o?.FullName ?? o?.fullName,
      email: o?.Email ?? o?.email,
      phone: o?.Phone ?? o?.phone,
      isActive: (o?.IsActive ?? o?.isActive ?? o?.active) === true,
      raw: o,
    }
  }

  const visible = (items||[]).filter(o=>{
    const q = (query||'').trim().toLowerCase()
    if(!q) return true
    const n = norm(o)
    return (n.nic||'').toString().toLowerCase().includes(q) || (n.fullName||'').toString().toLowerCase().includes(q) || (n.email||'').toString().toLowerCase().includes(q)
  })

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">EV Owners</h1>
          <p className="text-slate-500 text-sm">Add and manage EV owners. Click a row to view full details.</p>
        </div>
        <div className="flex items-center gap-3">
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search NIC, name, email..." className="border rounded px-3 py-2 text-sm w-64" />
        </div>
      </div>

      <form onSubmit={onCreate} className="bg-white border rounded-xl p-4 grid md:grid-cols-4 gap-3">
        <div>
          <label className="text-sm text-slate-600">NIC</label>
          <input className="border rounded px-3 py-2 w-full" placeholder="NIC" value={form.nic} onChange={e=>setForm({...form, nic:e.target.value})} />
        </div>
        <div>
          <label className="text-sm text-slate-600">Full name</label>
          <input className="border rounded px-3 py-2 w-full" placeholder="Full Name" value={form.fullName} onChange={e=>setForm({...form, fullName:e.target.value})} />
        </div>
        <div>
          <label className="text-sm text-slate-600">Email</label>
          <input className="border rounded px-3 py-2 w-full" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
        </div>
        <div>
          <label className="text-sm text-slate-600">Phone</label>
          <input className="border rounded px-3 py-2 w-full" placeholder="Phone" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} />
        </div>

        <div className="md:col-span-4">
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create Owner</button>
        </div>
      </form>

      <div className="hidden md:block bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left">NIC</th>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((o,i)=>{
              const n = norm(o)
              return (
                <tr key={n.nic ?? i} className="border-t hover:bg-slate-50 cursor-pointer" onClick={()=>setSelected(o)}>
                  <td className="px-4 py-3">{n.nic}</td>
                  <td className="px-4 py-3">{n.fullName}</td>
                  <td className="px-4 py-3 text-center">{n.email}</td>
                  <td className="px-4 py-3 text-center">{n.isActive ? 'Active' : 'Deactivated'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 items-center">
                      <Link to={`/app/owners/${n.nic}`} className="underline" onClick={e=>e.stopPropagation()}>Edit</Link>
                      {n.isActive ? (
                        <button className="text-red-600" disabled={busyNic===n.nic} onClick={async e=>{ e.stopPropagation(); setBusyNic(n.nic); try{ await deactivateOwner(n.nic); toast.success('Owner deactivated'); await load(); }catch(err){ console.error(err); toast.error('Failed to deactivate'); } finally{ setBusyNic(null)} }}>
                          {busyNic===n.nic ? 'Working…' : 'Deactivate'}
                        </button>
                      ) : (
                        <button className="text-green-700" disabled={busyNic===n.nic} onClick={async e=>{ e.stopPropagation(); setBusyNic(n.nic); try{ await reactivateOwner(n.nic); toast.success('Owner reactivated'); await load(); }catch(err){ console.error(err); toast.error('Failed to reactivate'); } finally{ setBusyNic(null)} }}>
                          {busyNic===n.nic ? 'Working…' : 'Reactivate'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {visible.map((o,i)=>{
          const n = norm(o)
          return (
            <div key={n.nic ?? i} className="bg-white border rounded-xl p-4" onClick={()=>setSelected(o)}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-base">{n.fullName}</div>
                  <div className="text-xs text-slate-500">{n.nic} • {n.email}</div>
                </div>
                <div className="text-xs text-slate-500">{n.isActive ? 'Active' : 'Deactivated'}</div>
              </div>
            </div>
          )
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setSelected(null)} />
          <div className="bg-white rounded-xl p-6 z-10 w-full max-w-md">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-semibold">{(selected?.FullName ?? selected?.fullName) || '—'}</h2>
                <div className="text-sm text-slate-500">NIC: {(selected?.Nic ?? selected?.nic) || '—'}</div>
              </div>
              <div>
                <button className="text-slate-500" onClick={()=>setSelected(null)}>Close</button>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div><strong>Email:</strong> {(selected?.Email ?? selected?.email) || '—'}</div>
              <div><strong>Phone:</strong> {(selected?.Phone ?? selected?.phone) || '—'}</div>
              <div><strong>Status:</strong> {(selected?.IsActive ?? selected?.isActive ?? selected?.active) ? 'Active' : 'Deactivated'}</div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link to={`/app/owners/${(selected?.Nic ?? selected?.nic) || ''}`} className="underline" onClick={()=>setSelected(null)}>Edit</Link>
              { (selected?.IsActive ?? selected?.isActive ?? selected?.active) ? (
                <button className="text-red-600" disabled={busyNic===(selected?.Nic ?? selected?.nic)} onClick={async ()=>{ const nic=(selected?.Nic ?? selected?.nic); setBusyNic(nic); try{ await deactivateOwner(nic); toast.success('Owner deactivated'); setSelected(null); await load(); }catch(e){ console.error(e); toast.error('Failed to deactivate') } finally{ setBusyNic(null) } }}>
                  {busyNic===(selected?.Nic ?? selected?.nic) ? 'Working…' : 'Deactivate'}
                </button>
              ) : (
                <button className="text-green-700" disabled={busyNic===(selected?.Nic ?? selected?.nic)} onClick={async ()=>{ const nic=(selected?.Nic ?? selected?.nic); setBusyNic(nic); try{ await reactivateOwner(nic); toast.success('Owner reactivated'); setSelected(null); await load(); }catch(e){ console.error(e); toast.error('Failed to reactivate') } finally{ setBusyNic(null) } }}>
                  {busyNic===(selected?.Nic ?? selected?.nic) ? 'Working…' : 'Reactivate'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
    </div>
  )
}
