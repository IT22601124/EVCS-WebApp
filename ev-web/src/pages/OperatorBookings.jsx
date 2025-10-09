import { useEffect, useMemo, useState } from "react";
import { listStations } from "../services/stations";
import {
  listBookingsByStationDate,
  scanQr,
  finalizeBooking,
} from "../services/bookings";
import toast from "react-hot-toast";

/* helpers */
const two = (n) => String(n).padStart(2, "0");
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
};
function fmtHM(x) {
  if (!x) return "";
  if (typeof x === "string") {
    const m = x.match(/^(\d{2}:\d{2})/);
    return m ? m[1] : x;
  }
  return x.toString?.() || "";
}
function StatusBadge({ status }) {
  const map = {
    Pending: "bg-amber-50 text-amber-700",
    Approved: "bg-emerald-50 text-emerald-700",
    Completed: "bg-slate-100 text-slate-700",
    Canceled: "bg-rose-50 text-rose-700",
  };
  const cls = map[status] || "bg-slate-100 text-slate-700";
  return <span className={`px-2.5 py-1 rounded-full text-xs ${cls}`}>{status}</span>;
}

export default function OperatorBookings() {
  const [date, setDate] = useState(todayStr());
  const [station, setStation] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrToken, setQrToken] = useState("");
  const [scanLoading, setScanLoading] = useState(false);

  // load operator's station (for now: pick first station)
  useEffect(() => {
    (async () => {
      const s = await listStations().catch(() => []);
      setStation(s?.[0] ?? null);
    })();
  }, []);

  // load bookings for station+date
  const load = async (sid, d) => {
    if (!sid || !d) return;
    setLoading(true);
    try {
      const data = await listBookingsByStationDate(sid, d);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (station?.id) load(station.id, date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station, date]);

  const totals = useMemo(() => {
    const all = items.length;
    const approved = items.filter((b) => b.status === "Approved").length;
    const pending = items.filter((b) => b.status === "Pending").length;
    const completed = items.filter((b) => b.status === "Completed").length;
    return { all, approved, pending, completed };
  }, [items]);

  async function doScan() {
    if (!qrToken.trim()) return toast.error("Enter a QR token");
    setScanLoading(true);
    try {
      const res = await scanQr(qrToken.trim());
      toast.success(`QR verified • Booking ${res.bookingId}`);
      setQrOpen(false);
      setQrToken("");
      if (station?.id) load(station.id, date);
    } catch (e) {
      console.error(e);
      toast.error("QR verification failed");
    } finally {
      setScanLoading(false);
    }
  }

  async function complete(id) {
    try {
      await finalizeBooking(id);
      toast.success("Marked as Completed");
      if (station?.id) load(station.id, date);
    } catch (e) {
      console.error(e);
      toast.error("Failed to finalize");
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Operator • Bookings</h1>
          <p className="text-slate-500 text-sm">
            View and process bookings for your station.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => setQrOpen(true)}
          >
            Scan / Verify QR
          </button>
        </div>
      </div>

      {/* Filters + KPIs */}
      <div className="bg-white border rounded-xl p-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-xs text-slate-500">Station</div>
            <div className="font-medium">
              {station ? `${station.name} (${station.type})` : "—"}
            </div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div>
            <div className="text-xs text-slate-500">Date</div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="border rounded px-3 py-1.5"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 w-full md:w-auto">
          <Kpi label="All" value={totals.all} />
          <Kpi label="Approved" value={totals.approved} color="emerald" />
          <Kpi label="Pending" value={totals.pending} color="amber" />
          <Kpi label="Completed" value={totals.completed} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <Th>Owner NIC</Th>
                <Th>Time</Th>
                <Th>Status</Th>
                <Th className="text-right pr-4">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-14 text-center text-slate-500">
                    No bookings found for this day.
                  </td>
                </tr>
              ) : (
                items.map((b) => (
                  <tr key={b.id} className="border-t">
                    <Td className="font-medium">{b.nic}</Td>
                    <Td>
                      {fmtHM(b.start)} – {fmtHM(b.end)}
                    </Td>
                    <Td>
                      <StatusBadge status={b.status} />
                    </Td>
                    <Td className="text-right pr-4">
                      <div className="inline-flex items-center gap-2">
                        {/* Operators DO NOT approve/create. They can scan + complete */}
                        <button
                          className="px-3 py-1 rounded border hover:bg-slate-50"
                          onClick={() => setQrOpen(true)}
                          title="Scan / verify QR"
                        >
                          Scan QR
                        </button>
                        {b.status === "Approved" && (
                          <button
                            className="px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                            onClick={() => complete(b.id)}
                            title="Mark as completed"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR modal */}
      {qrOpen && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50">
          <div className="bg-white rounded-xl p-5 w-[420px] max-w-[92vw]">
            <div className="text-lg font-semibold">Scan / Verify QR</div>
            <p className="text-slate-600 text-sm mt-1">
              Paste the QR token (or use a scanner to input) to verify a booking.
            </p>
            <input
              className="border rounded px-3 py-2 w-full mt-3"
              placeholder="QR token"
              value={qrToken}
              onChange={(e) => setQrToken(e.target.value)}
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-3 py-2 rounded border" onClick={() => setQrOpen(false)}>
                Close
              </button>
              <button
                className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                onClick={doScan}
                disabled={scanLoading}
              >
                {scanLoading ? "Verifying…" : "Verify"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* UI bits */
function Kpi({ label, value, color }) {
  const map = {
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };
  const cls = map[color] || "bg-slate-100 text-slate-700";
  return (
    <div className="rounded-lg border p-3 text-center">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 inline-block px-2 py-1 rounded ${cls} font-semibold`}>
        {value}
      </div>
    </div>
  );
}
function Th({ children, className = "" }) {
  return <th className={`px-4 py-3 text-left font-medium ${className}`}>{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;
}
