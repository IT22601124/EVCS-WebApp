

// src/services/users.js
import * as api from "../api/users";

export async function listUsers() {
  try {
    const data = await api.listUsers();
    return data; // [{ id, username, role, isActive }]
  } catch (err) {
    // Bubble up the server's message so UI can display it
    const msg =
      err?.response?.data?.error ||
      err?.response?.data?.title ||
      err?.response?.data?.detail ||
      err?.message ||
      "Unknown error";
    const e = new Error(String(msg));
    e.httpStatus = err?.response?.status;
    e.raw = err;
    throw e;
  }
}

export async function createUser({ username, password, role, isActive = true }) {
  try {
    const data = await api.createUser({
      username,
      password,
      role,
      isActive,
    });
    return data;
  } catch (err) {
    const msg =
      err?.response?.data?.error ||
      err?.response?.data?.title ||
      err?.response?.data?.detail ||
      err?.message ||
      "Unknown error";
    const e = new Error(String(msg));
    e.httpStatus = err?.response?.status;
    e.raw = err;
    throw e;
  }
}

export async function updateUser(username, req) {
  try {
    await api.updateUser(username, req);
  } catch (err) {
    const msg =
      err?.response?.data?.error ||
      err?.response?.data?.title ||
      err?.response?.data?.detail ||
      err?.message ||
      "Unknown error";
    const e = new Error(String(msg));
    e.httpStatus = err?.response?.status;
    e.raw = err;
    throw e;
  }
}

export async function deactivateUser(username) {
  // Prefer a dedicated endpoint if the API exposes it, but fall back to a full PUT update
  try {
    if (api.deactivateUser) {
      const data = await api.deactivateUser(username);
      return data;
    }
    // no dedicated endpoint exported; fall through to update path
  } catch (err) {
    // If the dedicated endpoint exists but returns 404 (or other), try the update fallback
    if (err?.response?.status !== 404) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.title ||
        err?.response?.data?.detail ||
        err?.message ||
        "Unknown error";
      const e = new Error(String(msg));
      e.httpStatus = err?.response?.status;
      e.raw = err;
      throw e;
    }
    // otherwise continue to fallback below
  }

  try {
    const u = await api.getUser(username);
    // send a full update payload with isActive=false
    const patched = { ...u, isActive: false };
    const data = await api.updateUser(username, patched);
    return data;
  } catch (err) {
    const msg =
      err?.response?.data?.error ||
      err?.response?.data?.title ||
      err?.response?.data?.detail ||
      err?.message ||
      "Unknown error";
    const e = new Error(String(msg));
    e.httpStatus = err?.response?.status;
    e.raw = err;
    throw e;
  }
}

export async function activateUser(username) {
  try {
    // server doesn't expose a dedicated activate endpoint in api/users.js; reuse updateUser with isActive=true if available
    // Try calling a dedicated endpoint first (api may expose it later)
    if (api.activateUser) {
      const data = await api.activateUser(username);
      return data;
    }
    // fallback: fetch user, patch isActive=true
    const u = await api.getUser(username);
    const patched = { ...u, isActive: true };
    const data = await api.updateUser(username, patched);
    return data;
  } catch (err) {
    const msg =
      err?.response?.data?.error ||
      err?.response?.data?.title ||
      err?.response?.data?.detail ||
      err?.message ||
      "Unknown error";
    const e = new Error(String(msg));
    e.httpStatus = err?.response?.status;
    e.raw = err;
    throw e;
  }
}