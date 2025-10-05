import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getOwner, createOwner, updateOwner } from '../services/owners'
import toast from 'react-hot-toast'

export default function OwnerForm(){
  const { nic } = useParams()
  const nav = useNavigate()
  const editing = !!nic
  const [form,setForm] = useState({ nic:'', fullName:'', email:'', phone:'' })
  useEffect(()=>{ if(editing){ getOwner(nic).then(setForm) } },[nic])
  const save = async (e)=>{
    e.preventDefault()
    try{
      if(editing) await updateOwner(form.nic, form)
      else await createOwner(form)
      toast.success('Saved')
  nav('/app/owners')
    }catch(err){
      console.error(err)
      const msg = err?.response?.data?.title || err?.response?.data || err?.message || 'Save failed'
      toast.error(String(msg))
    }
  }
  return (
    <form onSubmit={save} className="max-w-xl space-y-3">
      <h1 className="text-xl font-semibold">{editing?'Edit Owner':'New Owner'}</h1>
      <input className="border rounded px-3 py-2 w-full" placeholder="NIC" value={form.nic} onChange={e=>setForm({...form, nic:e.target.value})} readOnly={editing}/>
      <input className="border rounded px-3 py-2 w-full" placeholder="Full Name" value={form.fullName} onChange={e=>setForm({...form, fullName:e.target.value})}/>
      <input className="border rounded px-3 py-2 w-full" placeholder="Email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
      <input className="border rounded px-3 py-2 w-full" placeholder="Phone" value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})}/>
      <div className="flex gap-2">
        <button className="bg-blue-600 text-white px-3 py-2 rounded">Save</button>
  <button type="button" className="border px-3 py-2 rounded" onClick={()=>nav('/app/owners')}>Cancel</button>
      </div>
    </form>
  )
}
