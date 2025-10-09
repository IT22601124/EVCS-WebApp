import api from "../api/client";
import { listStations } from "./stations";

/* ---------------- helpers ---------------- */
function toHHMMSS(t) {
  // accepts "HH:mm" or "HH:mm:ss" and returns "HH:mm:ss"
  if (!t) return t;
  const parts = String(t).split(":");
  if (parts.length === 2) return `${parts[0].padStart(2,"0")}:${parts[1].padStart(2,"0")}:00`;
  if (parts.length === 3) return `${parts[0].padStart(2,"0")}:${parts[1].padStart(2,"0")}:${parts[2].padStart(2,"0")}`;
  return t;
}

/* ---------------- Queries ---------------- */

// List bookings by station + date (YYYY-MM-DD)
export async function listBookingsByStationDate(stationId, date) {
  const { data } = await api.get("/api/bookings", { params: { stationId, date } });
  return data || [];
}

// ✅ alias to match OperatorDashboard import
export const listByStationAndDate = listBookingsByStationDate;

// Get one booking by id
export async function getBooking(id) {
  const { data } = await api.get(`/api/bookings/${id}`);
  return data;
}

/**
 * Aggregate helper (no backend change):
 * - If stationId provided AND date provided -> single call
 * - If date provided and stationId === 'ALL' -> fetch all stations for that day
 * - If NO date provided:
 *    -> fetch a window of days (default next 14) for:
 *       - all stations (stationId === 'ALL'), or
 *       - one station
 */
export async function listBookingsAggregate({
  stationId = "ALL",
  date = "",          // "YYYY-MM-DD" or ""
  days = 14,          // window when date is empty
} = {}) {
  // Single day path
  if (date) {
    if (stationId && stationId !== "ALL") {
      return await listBookingsByStationDate(stationId, date);
    }
    const stations = await listStations().catch(() => []);
    const jobs = (stations || []).map((s) =>
      listBookingsByStationDate(s.id, date).catch(() => [])
    );
    const results = await Promise.all(jobs);
    return results.flat();
  }

  // Window path (no date): next N days
  const start = new Date();
  const daysArr = Array.from({ length: Math.max(1, days) }, (_, i) => {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  });

  if (stationId && stationId !== "ALL") {
    const jobs = daysArr.map((d) =>
      listBookingsByStationDate(stationId, d).catch(() => [])
    );
    const results = await Promise.all(jobs);
    return results.flat();
  }

  const stations = await listStations().catch(() => []);
  const jobs = [];
  for (const s of stations || []) {
    for (const d of daysArr) {
      jobs.push(listBookingsByStationDate(s.id, d).catch(() => []));
    }
  }
  const results = await Promise.all(jobs);
  return results.flat();
}

// Back-compat alias: some pages import `listBookings` (Dashboard)
export const listBookings = listBookingsAggregate;

/* ---------------- Mutations ---------------- */

// Create a booking
// req = { nic, stationId, date:'YYYY-MM-DD', start:'HH:mm'|'HH:mm:ss', end:'HH:mm'|'HH:mm:ss' }
export async function createBooking(req) {
  const payload = {
    ...req,
    start: toHHMMSS(req.start),
    end: toHHMMSS(req.end),
  };
  const { data } = await api.post("/bookings", payload);
  return data;
}

// Update a booking
// req = { date:'YYYY-MM-DD', start:'HH:mm'|'HH:mm:ss', end:'HH:mm'|'HH:mm:ss' }
export async function updateBooking(id, req) {
  const payload = {
    ...req,
    start: toHHMMSS(req.start),
    end: toHHMMSS(req.end),
  };
  await api.put(`/bookings/${id}`, payload);
}

// Cancel a booking (bubble backend message)
export async function cancelBooking(id) {
  try {
    await api.delete(`/api/bookings/${id}`);
  } catch (err) {
    const msg = err?.response?.data?.error || err?.response?.data || err.message;
    const e = new Error(msg);
    e.response = err.response;
    throw e;
  }
}

// Approve a booking (Backoffice). Backend should return the booking incl. qrToken.
export async function approveBooking(id) {
  try {
    const { data } = await api.post(`/api/bookings/${id}/approve`);
    return data;
  } catch (err) {
    const msg = err?.response?.data?.error || err?.response?.data || err.message;
    const e = new Error(msg);
    e.response = err.response;
    throw e;
  }
}

/**
 * Generate (or fetch) QR for a booking:
 *  - If status is Pending → approve once (creates qrToken)
 *  - If status is Approved → return the existing booking (with qrToken)
 *  - Otherwise → error
 */
export async function generateQr(id) {
  const b = await getBooking(id);

  if (b.status === "Pending") {
    try {
      const { data } = await api.post(`/api/bookings/${id}/approve`);
      return data; // should include qrToken
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data || err.message;
      const e = new Error(msg);
      e.response = err.response;
      throw e;
    }
  }

  if (b.status === "Approved") {
    return b; // already approved; should already have qrToken
  }

  throw new Error(`Cannot generate QR when status is ${b.status}`);
}

/* ---------------- Operator ops ---------------- */

// Scan QR (Operator/Backoffice)
export async function scanQr(token) {
  const { data } = await api.post("/api/bookings/scan", { qrToken: token });
  return data;
}

// Finalize booking (Operator/Backoffice)
export async function finalizeBooking(id) {
  await api.post(`/api/bookings/${id}/finalize`);
}
