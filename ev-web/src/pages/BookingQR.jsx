import { useLocation, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function BookingQR(){
  const { state } = useLocation()
  const { id } = useParams()
  const token = state?.qrToken || 'QR-'+id
  const [dataUrl, setDataUrl] = useState(null)

  useEffect(()=>{
    let cancelled = false
    if(!token) return
    QRCode.toDataURL(token, { width: 300, margin: 1 }, (err, url) => {
      if(cancelled) return
      if(err){
        console.error('QR render error', err)
        setDataUrl(null)
        return
      }
      setDataUrl(url)
    })
    return ()=>{ cancelled = true }
  },[token])

  return (
    <div className="max-w-xl space-y-3">
      <h1 className="text-xl font-semibold">Booking QR</h1>
      {dataUrl ? (
        <img src={dataUrl} alt="Booking QR" className="w-56 h-56 rounded shadow-sm bg-white" />
      ) : (
        <div className="w-56 h-56 bg-slate-100 grid place-items-center text-slate-400 rounded">QR</div>
      )}
      <div className="text-slate-600 text-sm">Token: {token}</div>
    </div>
  )
}
