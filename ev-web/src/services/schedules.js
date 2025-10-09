import api from "../api/client";

/* ---------- helpers ---------- */
function toHHMMSS(t) {
  if (!t) return "00:00:00";
  const [h = "00", m = "00", s = "00"] = String(t).split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}:${(s || "00").padStart(2, "0")}`;
}
function normSlots(slots = []) {
  return (slots || []).map((s) => ({
    start: toHHMMSS(s.start),   // "HH:mm" or "HH:mm:ss" -> "HH:mm:ss"
    end: toHHMMSS(s.end),
    available: Boolean(s.available),
    capacity: Math.max(0, Number(s.capacity ?? 0)), // 0 = maintenance block
  }));
}

/* ---------- queries ---------- */

export async function getSchedule(stationId, date /* YYYY-MM-DD */) {
  // Backend returns an array; we return first or null
  const { data } = await api.get("/api/schedules", { params: { stationId, date } });
  return (Array.isArray(data) && data[0]) || null;
}

/* ---------- mutations ---------- */

export async function upsertSchedule({ stationId, date, slots }) {
  // PUT then immediately GET to reflect server-side canonicalization
  const body = { stationId, date, slots: normSlots(slots) };

  try {
  await api.put("/api/schedules", body);
  } catch (err) {
    const msg = err?.response?.data?.error || err?.response?.data || err.message;
    const e = new Error(msg);
    e.response = err.response;
    throw e;
  }

  // Read back the saved schedule and return it
  const fresh = await getSchedule(stationId, date);
  return fresh;
}
