import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { listStations, getStation } from "../services/stations";
import { getSchedule, upsertSchedule } from "../services/schedules";
import { listBookingsByStationDate } from "../services/bookings";

/* ---------------- helpers ---------------- */

const H24 = Array.from({ length: 24 }, (_, h) => h);

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function addDaysISO(dateISO, n) {
  const d = new Date(dateISO);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function fmtDayTab(dateISO, baseISO) {
  const d = new Date(dateISO);
  const isToday = dateISO === todayISO();
  const wd = d.toLocaleDateString(undefined, { weekday: "short" });
  const mon = d.toLocaleDateString(undefined, { month: "short" });
  const day = d.getDate();
  return { label: isToday ? "Today" : wd, sub: `${mon} ${day}` };
}

function hhmm(h) {
  return `${String(h).padStart(2, "0")}:00`;
}
function toMinutes(hms) {
  if (!hms) return 0;
  const [h = "0", m = "0", s = "0"] = String(hms).split(":");
  return Number(h) * 60 + Number(m) + (Number(s) ? Number(s) / 60 : 0);
}
function hourRange(h) {
  const start = h * 60;
  const end = start + 60;
  return [start, end];
}
function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/** stable key for a slot row */
function slotKey(slot, fallback) {
  if (!slot) return `slot-${fallback}`;
  return `${slot.start ?? "S"}_${slot.end ?? "E"}_${slot.capacity ?? "C"}_${slot.available ? "A" : "M"}`;
}

/* Make an empty slot template snapping to whole hours */
function makeSlot(startHour = 9, endHour = 10, capacity = 1, available = true) {
  const S = `${String(startHour).padStart(2, "0")}:00:00`;
  const E = `${String(endHour).padStart(2, "0")}:00:00`;
  return { start: S, end: E, capacity, available };
}

/* ---------------- component ---------------- */

export default function Schedules() {
  const [stations, setStations] = useState([]);
  const [stationId, setStationId] = useState("");
  const [stationMeta, setStationMeta] = useState(null); // for Slots max

  // calendar base date (start of the visible 7-day window)
  const [baseDate, setBaseDate] = useState(todayISO());
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysISO(baseDate, i)), [baseDate]);
  const [dayIndex, setDayIndex] = useState(0);
  const date = days[dayIndex];

  // editor state
  const [slots, setSlots] = useState([]); // [{start,end,capacity,available}]
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // quick grid data
  const [bookings, setBookings] = useState([]);

  // load stations once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const ss = await listStations().catch(() => []);
        if (cancelled) return;
        setStations(ss || []);
        if (ss?.length && !stationId) {
          setStationId(ss[0].id);
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to load stations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load station meta (to know Slots max)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!stationId) return;
      try {
        const meta = await getStation(stationId).catch(() => null);
        if (!cancelled) setStationMeta(meta);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [stationId]);

  // load schedule + bookings whenever station/date changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!stationId || !date) return;
      try {
        setLoading(true);
        const [s, bs] = await Promise.all([
          getSchedule(stationId, date),
          listBookingsByStationDate(stationId, date).catch(() => []),
        ]);
        if (cancelled) return;
        setSlots(s?.slots || []);
        setBookings(bs || []);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setSlots([]);
          setBookings([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [stationId, date]);

  const maxCols = Math.max(1, Number(stationMeta?.slots || 1)); // columns in quick grid

  /* ------------- editor handlers ------------- */

  function addWindow() {
    const last = slots[slots.length - 1];
    let sh = 9, eh = 10;
    if (last) {
      const lastEndH = parseInt(String(last.end).split(":")[0] || "10", 10);
      sh = Math.min(23, lastEndH);
      eh = Math.min(24, lastEndH + 1);
    }
    const cap = Math.min(maxCols, 1);
    setSlots((prev) => [...prev, makeSlot(sh, eh, cap, true)]);
  }

  function updateSlot(idx, patch) {
    setSlots((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    );
  }

  function removeSlot(idx) {
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  }

  function duplicateSlot(idx) {
    setSlots((prev) => {
      const base = prev[idx];
      if (!base) return prev;
      return [...prev, { ...base }];
    });
  }

  function normalizeTime(val, fallback = "00:00:00") {
    if (!val) return fallback;
    const parts = val.split(":").map((x) => x.padStart(2, "0"));
    if (parts.length === 2) return `${parts[0]}:${parts[1]}:00`;
    if (parts.length >= 3) return `${parts[0]}:${parts[1]}:${parts[2]}`;
    return fallback;
  }

  async function save() {
    if (!stationId) return toast.error("Choose a station first");

    for (const s of slots) {
      const cap = Number(s.capacity || 0);
      if (cap < 0) return toast.error("Capacity cannot be negative");
      if (cap > maxCols) {
        return toast.error(`Capacity (${cap}) cannot exceed station slots (${maxCols})`);
      }
    }
    const sorted = [...slots].map((s) => ({
      ...s,
      start: normalizeTime(s.start, "00:00:00"),
      end: normalizeTime(s.end, "00:00:00"),
    })).sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i];
      if (toMinutes(a.end) <= toMinutes(a.start)) {
        return toast.error("Each window's end time must be after its start time");
      }
      for (let j = i + 1; j < sorted.length; j++) {
        const b = sorted[j];
        if (overlaps(toMinutes(a.start), toMinutes(a.end), toMinutes(b.start), toMinutes(b.end))) {
          if (a.available && b.available) {
            toast("Overlapping available windows detected — the grid will sum capacities.", { icon: "⚠️" });
          }
        }
      }
    }

    try {
      setSaving(true);
      await upsertSchedule({ stationId, date, slots: sorted });
      toast.success("Schedule saved");
      const bs = await listBookingsByStationDate(stationId, date).catch(() => []);
      setBookings(bs || []);
      setSlots(sorted);
    } catch (e) {
      console.error(e);
      const msg = e?.response?.data?.error || e?.response?.data || e.message;
      toast.error(String(msg || "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  /* ------------- quick grid computation ------------- */

  const hourRows = useMemo(() => {
    return H24.map((h) => {
      const [hs, he] = hourRange(h);
      const covering = (slots || []).filter((s) => {
        const ss = toMinutes(s.start);
        const se = toMinutes(s.end);
        return ss <= hs && se >= he;
      });
      const maintenance = covering.some((s) => s.available === false);
      const capFromWindows = covering
        .filter((s) => s.available !== false)
        .reduce((sum, s) => sum + Math.max(0, Number(s.capacity || 0)), 0);

      const capacity = Math.min(maxCols, Math.max(0, capFromWindows));
      const bookedCount = maintenance
        ? 0
        : bookings.reduce((acc, b) => {
            const bs = toMinutes(b.start);
            const be = toMinutes(b.end);
            return acc + (overlaps(hs, he, bs, be) ? 1 : 0);
          }, 0);
      const available = maintenance ? 0 : Math.max(0, capacity - bookedCount);

      return { hour: h, label: hhmm(h), capacity, booked: bookedCount, available, maintenance };
    });
  }, [slots, bookings, maxCols]);

  /* ------------- calendar controls ------------- */

  function jump(daysDelta) {
    setBaseDate((prev) => addDaysISO(prev, daysDelta));
    setDayIndex(0);
  }
  function pickDate(iso) {
    if (!iso) return;
    setBaseDate(iso);
    setDayIndex(0);
  }
  function goToday() {
    const t = todayISO();
    setBaseDate(t);
    setDayIndex(0);
  }

  /* ---------------- render ---------------- */

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <div className="text-slate-500 text-xs">Schedules</div>
        <div className="text-2xl font-semibold">Publish & Quick View</div>
        <p className="text-slate-500 mt-1 text-sm">
          A station’s <b>Slots</b> is the max simultaneous cars. Each schedule window can expose up to
          that capacity (or be marked <b>Maintenance</b>).
        </p>
      </div>

      {/* Top controls: station selector + calendar & 7-day tabs */}
      <div className="bg-white border rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs text-slate-500">Station</div>
            <select
              className="mt-1 border rounded-lg px-3 py-2 min-w-[260px]"
              value={stationId}
              onChange={(e) => setStationId(e.target.value)}
            >
              {(stations || []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.address}
                </option>
              ))}
            </select>
            {!!stationMeta && (
              <div className="text-xs text-slate-500 mt-1">
                Max simultaneous vehicles: <b>{stationMeta.slots}</b>
              </div>
            )}
          </div>

          {/* Calendar controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => jump(-7)}
              className="px-3 py-2 rounded-lg border bg-slate-50 hover:bg-slate-100"
              title="Previous 7 days"
            >
              ◀︎ 7d
            </button>
            <input
              type="date"
              className="border rounded-lg px-3 py-2"
              value={baseDate}
              onChange={(e) => pickDate(e.target.value)}
            />
            <button
              onClick={goToday}
              className="px-3 py-2 rounded-lg border bg-slate-50 hover:bg-slate-100"
              title="Jump to today"
            >
              Today
            </button>
            <button
              onClick={() => jump(7)}
              className="px-3 py-2 rounded-lg border bg-slate-50 hover:bg-slate-100"
              title="Next 7 days"
            >
              7d ▶︎
            </button>
          </div>
        </div>

        {/* 7-day tabs */}
        <div className="flex gap-2 overflow-x-auto">
          {days.map((d, i) => {
            const { label, sub } = fmtDayTab(d, baseDate);
            const active = i === dayIndex;
            return (
              <button
                key={d}
                onClick={() => setDayIndex(i)}
                className={
                  "px-4 py-3 rounded-xl border transition " +
                  (active
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-700 hover:bg-slate-50 border-slate-200")
                }
              >
                <div className="text-sm font-semibold">{label}</div>
                <div className={active ? "text-blue-100 text-xs" : "text-slate-500 text-xs"}>
                  {sub}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b px-5 py-3 font-semibold flex items-center justify-between">
          <span>
            Edit Windows — {new Date(date).toLocaleDateString()} {" "}
            {stationMeta ? `• Max capacity ${stationMeta.slots}` : ""}
          </span>
          <div className="flex gap-2">
            <button
              onClick={addWindow}
              className="px-3 py-2 rounded-lg border bg-slate-50 hover:bg-slate-100"
            >
              + Add window
            </button>
            <button
              onClick={save}
              disabled={saving}
              className={
                "px-3 py-2 rounded-lg text-white " +
                (saving ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700")
              }
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        {slots.length === 0 ? (
          <div className="py-10 text-center text-slate-500">
            No windows yet. Click <b>+ Add window</b> to create the first one.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left">Start</th>
                <th className="px-4 py-2 text-left">End</th>
                <th className="px-4 py-2 text-center">Capacity</th>
                <th className="px-4 py-2 text-center">Maintenance</th>
                <th className="px-4 py-2 text-right w-40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((s, idx) => {
                const cap = Number(s.capacity || 0);
                const capErr = cap > maxCols || cap < 0;
                return (
                  <tr key={slotKey(s, idx)} className="border-t">
                    <td className="px-4 py-2">
                      <input
                        className="border rounded px-2 py-1 w-28"
                        placeholder="HH:mm"
                        value={(s.start || "").slice(0, 5)}
                        onChange={(e) =>
                          updateSlot(idx, { start: normalizeTime(e.target.value, s.start) })
                        }
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        className="border rounded px-2 py-1 w-28"
                        placeholder="HH:mm"
                        value={(s.end || "").slice(0, 5)}
                        onChange={(e) =>
                          updateSlot(idx, { end: normalizeTime(e.target.value, s.end) })
                        }
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="number"
                        className={
                          "border rounded px-2 py-1 w-24 text-center " +
                          (capErr ? "border-rose-300 bg-rose-50" : "")
                        }
                        min={0}
                        max={maxCols}
                        value={cap}
                        onChange={(e) => updateSlot(idx, { capacity: Number(e.target.value || 0) })}
                      />
                      {capErr && (
                        <div className="text-rose-600 text-xs mt-1">≤ {maxCols}</div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={s.available === false}
                        onChange={(e) => updateSlot(idx, { available: e.target.checked ? false : true })}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => duplicateSlot(idx)}
                          className="px-2 py-1 rounded border bg-slate-50 hover:bg-slate-100"
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={() => removeSlot(idx)}
                          className="px-2 py-1 rounded border bg-rose-50 text-rose-700 hover:bg-rose-100"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Legend */}
      <div className="bg-white border rounded-xl px-4 py-3 shadow-sm text-sm">
        <div className="flex items-center gap-6">
          <span className="text-slate-500">Legend:</span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-slate-200 inline-block" />
            <span className="text-slate-600">Available</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-amber-200 inline-block" />
            <span className="text-slate-600">Booked</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-rose-200 inline-block" />
            <span className="text-slate-600">Maintenance</span>
          </span>
        </div>
      </div>

      {/* Quick grid */}
      <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b px-5 py-3 font-semibold flex items-center justify-between">
          <span>Quick View — {new Date(date).toLocaleDateString()}</span>
          <span className="text-slate-500 text-sm">Columns = station capacity ({maxCols})</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 text-left w-24">Time</th>
                {Array.from({ length: maxCols }, (_, i) => (
                  <th key={`h-${i}`} className="px-4 py-2 text-center">
                    Slot {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hourRows.map((r) => {
                const cells = [];
                if (r.maintenance) {
                  for (let i = 0; i < maxCols; i++) {
                    cells.push(
                      <td key={`m-${r.hour}-${i}`} className="px-4 py-2 text-center bg-rose-50 text-rose-700">
                        Maintenance
                      </td>
                    );
                  }
                } else {
                  const booked = Math.min(r.booked, r.capacity);
                  const available = Math.max(0, r.capacity - booked);
                  for (let i = 0; i < booked; i++) {
                    cells.push(
                      <td key={`b-${r.hour}-${i}`} className="px-4 py-2 text-center bg-amber-100 text-amber-800">
                        Booked
                      </td>
                    );
                  }
                  for (let i = 0; i < available; i++) {
                    cells.push(
                      <td key={`a-${r.hour}-${i}`} className="px-4 py-2 text-center bg-slate-100 text-slate-700">
                        Available
                      </td>
                    );
                  }
                  for (let i = r.capacity; i < maxCols; i++) {
                    cells.push(
                      <td key={`f-${r.hour}-${i}`} className="px-4 py-2 text-center bg-slate-50 text-slate-400">
                        —
                      </td>
                    );
                  }
                }

                return (
                  <tr key={`row-${r.hour}`} className="border-t">
                    <td className="px-4 py-2 font-mono text-slate-600">{r.label}</td>
                    {cells}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {loading && <div className="text-center text-slate-500 py-6">Loading…</div>}
    </div>
  );
}
