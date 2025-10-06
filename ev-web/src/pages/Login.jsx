import { useState } from 'react'
import { login as apiLogin } from '../api/auth'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function Login(){
  const [u,setU] = useState('')
  const [p,setP] = useState('')
  const nav = useNavigate()
  const submit = async (e)=>{
    e.preventDefault()
    try{
      // debug: log exact payload we're about to send to the API
      const payload = { username: u, password: p }
      console.debug('[auth] login payload', payload)
      const data = await apiLogin(u,p)
      // Accept multiple shapes: { token }, { accessToken }, or raw string
      let token = null
      if(!data) throw new Error('Empty login response')
      if(typeof data === 'string') token = data
      else if(data.token) token = data.token
      else if(data.accessToken) token = data.accessToken
      else if(data.jwt) token = data.jwt
      else if(data?.access_token) token = data.access_token

      if(!token) throw new Error('Login did not return a token')

      // store token: only set `jwt` when it looks like a compact JWT (header.payload.sig)
      if(typeof token === 'string' && token.split('.').length >= 3){
        localStorage.setItem('jwt', token)
        try{
          const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
          localStorage.setItem('jwt_mock', JSON.stringify({ username: payload.name || payload.sub || payload.email || payload.username || null, role: payload.role || payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || payload.role }))
        }catch(e){
          // ignore parsing errors
        }
      }else{
        // fallback: store as jwt_mock JSON string so client-side role checks still work
        try{
          localStorage.setItem('jwt_mock', JSON.stringify(token))
        }catch(e){
          // no-op
        }
      }

      console.debug('[auth] apiLogin succeeded for', u)
      toast.success('Logged in')
      // attempt to extract role from stored token
      const raw = localStorage.getItem('jwt') || localStorage.getItem('jwt_mock')
      let role = null
      try{
        if(raw){
          const parsed = typeof raw === 'string' && raw.trim().startsWith('{') ? JSON.parse(raw) : JSON.parse(atob(raw.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))
          role = parsed?.role || parsed?.roles || parsed?.Role || parsed?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
          if(Array.isArray(role)) role = role[0]
        }
      }catch(e){ /* ignore */ }

      if(role === 'Operator') nav('/app/operator')
      else nav('/app')
    }catch(e){
      // Log full error for debugging
      console.error('[auth] login failed', e, e?.response?.data)
      // Attempt to extract a useful message from the server response
      const serverMsg = e?.response?.data?.message || e?.response?.data || e.message
      const short = typeof serverMsg === 'string' ? serverMsg : JSON.stringify(serverMsg)
      toast.error(short.slice(0,200))
    }
  }
  return (
    <div className="grid place-items-center min-h-screen bg-slate-50">
      <form onSubmit={submit} className="bg-white p-6 rounded-xl shadow w-[380px] space-y-3">
        <div className="text-2xl font-semibold text-center">EVCS Login</div>
        <input className="border rounded px-3 py-2 w-full" placeholder="Username" value={u} onChange={e=>setU(e.target.value)}/>
        <input className="border rounded px-3 py-2 w-full" type="password" placeholder="Password" value={p} onChange={e=>setP(e.target.value)}/>
        <button className="bg-blue-600 text-white rounded px-3 py-2 w-full">Sign in</button>
  <div className="text-xs text-slate-500">Use backend admin/Admin@123 (Backoffice) or mock admin/admin (dev)</div>
      </form>
    </div>
  )
}
