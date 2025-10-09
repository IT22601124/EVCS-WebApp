import { useEffect, useMemo, useState } from "react";
import { listStations } from "../services/stations";
import {
  listBookingsAggregate,
  cancelBooking,
  approveBooking,
} from "../services/bookings";
import QRCode from 'qrcode'
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

/* ---------- helpers ---------- */
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}
function prettyId(prefix, raw, width = 3) {
  if (!raw) return `${prefix}${"".padStart(width, "0")}`;
  const n = (hashCode(String(raw)) % 1000) + 1;
  return `${prefix}${String(n).padStart(width, "0")}`;
}
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Accepts backend DateOnly {year,month,day} OR "YYYY-MM-DD"
function fmtDate(d) {
  if (!d) return "—";
  if (typeof d === "string") return d;
  const y = d.year ?? d.Year, m = d.month ?? d.Month, dd = d.day ?? d.Day;
  if (y && m && dd) return `${y}-${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  return "—";
}

// Accepts backend TimeOnly {hour,minute,second} OR "HH:mm"|"HH:mm:ss"
function fmtTime(t) {
  if (!t) return "—";
  if (typeof t === "string") {
    const [h = "00", m = "00"] = t.split(":");
    return `${h.padStart(2,"0")}:${m.padStart(2,"0")}`;
  }
  const h = t.hour ?? t.Hour ?? 0;
  const m = t.minute ?? t.Minute ?? 0;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

function StatusBadge({ status }) {
  const cls =
    status === "Approved" ? "bg-emerald-100 text-emerald-700" :
    status === "Pending"  ? "bg-amber-100 text-amber-700"   :
    status === "Completed"? "bg-sky-100 text-sky-700"        :
                            "bg-rose-100 text-rose-700";
  return <span className={`px-2 py-1 rounded-full text-xs ${cls}`}>{status}</span>;
}

function Chip({ children, tone="slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    sky: "bg-sky-100 text-sky-700",
    violet: "bg-violet-100 text-violet-700",
  };
  return <span className={`px-2 py-1 rounded text-xs ${tones[tone]}`}>{children}</span>;
}

/* ---------- main ---------- */
export default function Bookings() {
  const nav = useNavigate();

  const [stations, setStations] = useState([]);
  const [stationId, setStationId] = useState("ALL");
  const [date, setDate] = useState(todayISO());
  const [rows, setRows] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(null); // bookingId while acting

  // Drawer (View) state
  const [openView, setOpenView] = useState(false);
  const [selected, setSelected] = useState(null);
  const [selectedQrDataUrl, setSelectedQrDataUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        setLoading(true);
        const ss = await listStations().catch(() => []);
        if (!cancelled) setStations(ss);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  const refresh = async () => {
    try {
      setLoading(true);
      const data = await listBookingsAggregate({
        stationId,
        date,
        days: 1,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationId, date]);

  const stationMap = useMemo(() => {
    const map = {};
    for (const s of stations) map[s.id] = s;
    return map;
  }, [stations]);

  const doCancel = async (id) => {
    try {
      setLoadingAction(id);
      await cancelBooking(id);
      toast.success("Booking cancelled");
      await refresh();
      // close view if we were viewing this one
      if (selected?.id === id) setOpenView(false);
    } catch (err) {
      const msg = err?.message || "Cancel failed";
      toast.error(msg);
    } finally {
      setLoadingAction(null);
    }
  };

  const doApprove = async (id) => {
    try {
      setLoadingAction(id);
      const res = await approveBooking(id);
      // server should return booking including qrToken
      const token = res?.qrToken || res?.qr_token || null;
      toast.success("Booking approved (QR generated)");
      await refresh();
      if (token) {
        // navigate to QR view with token in state
        nav(`/app/bookings/${id}/qr`, { state: { qrToken: token } });
        return;
      }
    } catch (err) {
      const msg = err?.message || "Approve failed";
      toast.error(msg);
    } finally {
      setLoadingAction(null);
    }
  };

  function openDetails(b) {
    setSelected(b);
    setOpenView(true);
  }

  useEffect(()=>{
    let cancelled = false
    if(!selected?.qrToken){ setSelectedQrDataUrl(null); return }
    QRCode.toDataURL(selected.qrToken, { width: 220, margin: 1 }, (err, url) => {
      if(cancelled) return
      if(err){ console.error('QR render error', err); setSelectedQrDataUrl(null); return }
      setSelectedQrDataUrl(url)
    })
    return ()=>{ cancelled = true }
  },[selected?.qrToken])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-slate-500">Management</div>
          <div className="text-2xl font-semibold">Bookings</div>
        </div>
        <button
          onClick={() => nav("/app/bookings/new")}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700"
        >
          + New Booking
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-xl p-4 shadow-sm grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">Station</label>
          <select
            className="border rounded-lg px-3 py-2"
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
          >
            <option value="ALL">All stations</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">Date</label>
          <input
            type="date"
            className="border rounded-lg px-3 py-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button
            className="border rounded-lg px-4 py-2 w-full sm:w-auto hover:bg-slate-50"
            onClick={refresh}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl shadow-sm overflow-x-auto">
        <div className="border-b px-5 py-3 text-sm text-slate-600">
          {rows.length} result{rows.length !== 1 ? "s" : ""}
        </div>
        {loading ? (
          <div className="py-10 text-center text-slate-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-slate-500">
            No bookings found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left">Booking</th>
                <th className="px-4 py-2 text-left">Owner NIC</th>
                <th className="px-4 py-2 text-left">Station</th>
                <th className="px-4 py-2 text-center">Date</th>
                <th className="px-4 py-2 text-center">Time</th>
                <th className="px-4 py-2 text-center">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const st = stationMap[b.stationId];
                return (
                  <tr key={b.id} className="border-t">
                    <td className="px-4 py-2">
                      <div className="text-xs text-slate-400">
                        {prettyId("BOOK", b.id)}
                      </div>
                      <div className="font-medium">{b.id.slice(0, 10)}…</div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-medium">{b.nic}</span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col">
                        <span className="font-medium">{st?.name || "—"}</span>
                        <span className="text-xs text-slate-500">{b.stationId}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Chip tone="sky">{fmtDate(b.date)}</Chip>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Chip tone="violet">
                        {fmtTime(b.start)} → {fmtTime(b.end)}
                      </Chip>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <StatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openDetails(b)}
                          className="px-3 py-1 border rounded-lg hover:bg-slate-50"
                          title="View details"
                        >
                          View
                        </button>

                        <Link
                          to={`/app/bookings/${b.id}`}
                          className="px-3 py-1 border rounded-lg hover:bg-slate-50"
                          title="Edit"
                        >
                          Edit
                        </Link>

                        {b.status === "Pending" && (
                          <button
                            disabled={loadingAction === b.id}
                            onClick={() => doApprove(b.id)}
                            className="px-3 py-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                            title="Approve & Generate QR"
                          >
                            Approve
                          </button>
                        )}

                        {b.status === "Approved" && (
                          <Link
                            to={`/app/bookings/${b.id}/qr`}
                            className="px-3 py-1 rounded-lg bg-sky-600 text-white hover:bg-sky-700"
                            title="Show QR"
                          >
                            QR
                          </Link>
                        )}

                        {b.status !== "Cancelled" && b.status !== "Completed" && (
                          <button
                            disabled={loadingAction === b.id}
                            onClick={() => doCancel(b.id)}
                            className="px-3 py-1 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                            title="Cancel"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ---------- View Drawer ---------- */}
      {openView && selected && (
        <div className="fixed inset-0 z-40" aria-modal="true" role="dialog">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpenView(false)} />
          <div
            className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Booking Details</div>
              <button onClick={() => setOpenView(false)} className="px-3 py-1 rounded border">
                Close
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-slate-500">Booking</div>
                <div className="col-span-2">
                  <div className="text-xs text-slate-400">{prettyId("BOOK", selected.id)}</div>
                  <div className="font-medium">{selected.id}</div>
                </div>

                <div className="text-slate-500">Owner NIC</div>
                <div className="col-span-2">{selected.nic}</div>

                <div className="text-slate-500">Station</div>
                <div className="col-span-2">
                  <div className="font-medium">{stationMap[selected.stationId]?.name || "—"}</div>
                  <div className="text-xs text-slate-500">{selected.stationId}</div>
                </div>

                <div className="text-slate-500">Date</div>
                <div className="col-span-2">{fmtDate(selected.date)}</div>

                <div className="text-slate-500">Time</div>
                <div className="col-span-2">
                  {fmtTime(selected.start)} → {fmtTime(selected.end)}
                </div>

                <div className="text-slate-500">Status</div>
                <div className="col-span-2">
                  <StatusBadge status={selected.status} />
                </div>

                <div className="text-slate-500">QR Token</div>
                <div className="col-span-2 break-all">
                  {selected.qrToken ? (
                    <div className="flex items-center gap-3">
                      <div>
                        {selectedQrDataUrl ? (
                          <img src={selectedQrDataUrl} alt="QR" className="w-36 h-36 bg-white rounded" />
                        ) : (
                          <div className="w-36 h-36 bg-slate-100 grid place-items-center text-slate-400 rounded">QR</div>
                        )}
                      </div>
                      <div className="text-sm break-all">{selected.qrToken}</div>
                    </div>
                  ) : (
                    "—"
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-2 justify-end">
                <Link
                  to={`/app/bookings/${selected.id}`}
                  className="px-3 py-2 border rounded-lg hover:bg-slate-50"
                  onClick={() => setOpenView(false)}
                >
                  Edit
                </Link>
                {selected.status === "Pending" && (
                  <button
                    disabled={loadingAction === selected.id}
                    onClick={() => doApprove(selected.id)}
                    className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                )}
                {selected.status === "Approved" && (
                  <Link
                    to={`/app/bookings/${selected.id}/qr`}
                    className="px-3 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700"
                    onClick={() => setOpenView(false)}
                  >
                    Show QR
                  </Link>
                )}
                {selected.status !== "Cancelled" && selected.status !== "Completed" && (
                  <button
                    disabled={loadingAction === selected.id}
                    onClick={() => doCancel(selected.id)}
                    className="px-3 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
