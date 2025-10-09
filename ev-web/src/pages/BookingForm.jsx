import { useEffect, useMemo, useState } from "react";
import { listStations } from "../services/stations";
import {
  createBooking,
  updateBooking,
  getBooking,
  listBookingsByStationDate,
} from "../services/bookings";
import api from "../api/client";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

/* ---------- helpers ---------- */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function addDaysISO(d, n) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}
function hhmmss(h, m) {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}
function toHHMMSS(t) {
  if (!t) return "";
  const [h = "00", m = "00", s = "00"] = String(t).split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:${s.padStart(2, "0")}`;
}
function slotKey(slot, i) {
  const start = toHHMMSS(slot?.start);
  const end = toHHMMSS(slot?.end);
  return `${start || "start"}-${end || "end"}-${i}`;
}
function slotLabel(slot) {
  const start = toHHMMSS(slot?.start);
  const end = toHHMMSS(slot?.end);
  if (!start || !end) return "Invalid slot";
  return `${start} → ${end} (cap ${slot?.capacity ?? 1})`;
}

export default function BookingForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [stations, setStations] = useState([]);
  const [stationId, setStationId] = useState("");
  const [nic, setNic] = useState("");
  const [date, setDate] = useState(todayISO());
  const [slot, setSlot] = useState("");

  const [schedule, setSchedule] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* ---------- initial data ---------- */
  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        setLoading(true);
        const ss = await listStations().catch(() => []);
        if (!cancelled) setStations(ss);

        if (isEdit) {
          const b = await getBooking(id);
          const d = `${b.date.year}-${String(b.date.month).padStart(2, "0")}-${String(
            b.date.day
          ).padStart(2, "0")}`;
          const start = hhmmss(b.start.hour, b.start.minute);
          const end = hhmmss(b.end.hour, b.end.minute);
          if (!cancelled) {
            setNic(b.nic);
            setStationId(b.stationId);
            setDate(d);
            setSlot(`${start}|${end}`);
          }
        } else if (ss.length > 0) {
          if (!cancelled) setStationId(ss[0].id);
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to load form data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  /* ---------- schedule load ---------- */
  useEffect(() => {
    let cancelled = false;
    async function loadSchedule() {
      try {
        if (!stationId || !date) {
          setSchedule(null);
          return;
        }
        const { data } = await api.get("/api/schedules", {
          params: { stationId, date },
        });
        if (!cancelled) setSchedule((data || [])[0] || null);
      } catch (e) {
        console.error(e);
        if (!cancelled) setSchedule(null);
      }
    }
    loadSchedule();
    return () => {
      cancelled = true;
    };
  }, [stationId, date]);

  /* ---------- conflicts ---------- */
  useEffect(() => {
    let cancelled = false;
    async function loadConflicts() {
      try {
        if (!stationId || !date) {
          setConflicts([]);
          return;
        }
        const data = await listBookingsByStationDate(stationId, date);
        if (!cancelled) setConflicts(data || []);
      } catch {
        if (!cancelled) setConflicts([]);
      }
    }
    loadConflicts();
    return () => {
      cancelled = true;
    };
  }, [stationId, date]);

  const validSlots = useMemo(() => {
    if (!schedule) return [];
    return (schedule.slots || [])
      .filter((s) => !!toHHMMSS(s?.start) && !!toHHMMSS(s?.end))
      .map((s, i) => ({
        key: slotKey(s, i),
        start: toHHMMSS(s.start),
        end: toHHMMSS(s.end),
        label: slotLabel(s),
      }));
  }, [schedule]);

  /* ---------- date window ---------- */
  const minDate = todayISO();
  const maxDate = addDaysISO(new Date(), 7);

  /* ---------- submit ---------- */
  async function submit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      if (!stationId || !nic || !date || !slot) {
        toast.error("Please fill all fields");
        return;
      }
      const [start, end] = slot.split("|");
      if (isEdit) {
        await updateBooking(id, { date, start, end });
        toast.success("Booking updated");
        nav("/app/bookings");
      } else {
        await createBooking({ nic, stationId, date, start, end });
        toast.success("Booking created");
        nav("/app/bookings");
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return <div className="py-20 text-center text-slate-500">Loading…</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500">Management</div>
          <div className="text-2xl font-semibold">
            {isEdit ? "Edit Booking" : "New Booking"}
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={submit} className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
        {!isEdit && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col">
              <label className="text-xs text-slate-500 mb-1">Owner NIC</label>
              <input
                className="border rounded-lg px-3 py-2"
                value={nic}
                onChange={(e) => setNic(e.target.value)}
                placeholder="e.g. 200012345678"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-slate-500 mb-1">Station</label>
              <select
                className="border rounded-lg px-3 py-2"
                value={stationId}
                onChange={(e) => setStationId(e.target.value)}
              >
                {stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {isEdit && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col">
              <label className="text-xs text-slate-500 mb-1">Owner NIC</label>
              <input className="border rounded-lg px-3 py-2 bg-slate-50" value={nic} disabled />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-slate-500 mb-1">Station</label>
              <input
                className="border rounded-lg px-3 py-2 bg-slate-50"
                value={stations.find((s) => s.id === stationId)?.name || stationId}
                disabled
              />
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col">
            <label className="text-xs text-slate-500 mb-1">Date</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2"
              value={date}
              min={minDate}
              max={maxDate}
              onChange={(e) => setDate(e.target.value)}
            />
            <div className="text-xs text-slate-500 mt-1">
              Bookings allowed only within 7 days from today.
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-slate-500 mb-1">Time Slot</label>
            <select
              className="border rounded-lg px-3 py-2"
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
            >
              <option value="">Select a slot</option>
              {validSlots.map((s) => (
                <option key={s.key} value={`${s.start}|${s.end}`}>
                  {s.label}
                </option>
              ))}
            </select>
            <div className="text-xs text-slate-500 mt-1">
              Slots come from the station’s schedule for that date.
            </div>
          </div>
        </div>

        {!!conflicts.length && (
          <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            ⚠ {conflicts.length} existing booking(s) on this day. Capacity enforced by backend.
          </div>
        )}

        <div className="pt-2 flex gap-3">
          <button
            disabled={saving}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
          >
            {isEdit ? "Save Changes" : "Create Booking"}
          </button>
          <button
            type="button"
            onClick={() => nav("/app/bookings")}
            className="border rounded-lg px-4 py-2 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
