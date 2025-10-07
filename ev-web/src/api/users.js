import api from "./client";

// Server exposes users under /api/Users (match server casing to avoid frontend HTML)
export const listUsers = () => {
  console.debug('[api] GET /api/Users requesting baseURL=', api.defaults.baseURL)
  return api.get("/api/Users").then(r => {
    console.debug('[api] GET /api/Users response:', r)
    return r.data
  })
}

export const getUser = (username) => {
  console.debug('[api] GET /api/Users/' + username + ' requesting baseURL=', api.defaults.baseURL)
  return api.get(`/api/Users/${encodeURIComponent(username)}`).then(r => r.data)
}

// Fetch the current authenticated user (server may expose /api/Users/me)
export const getCurrentUser = () => {
  console.debug('[api] GET /api/Users/me requesting baseURL=', api.defaults.baseURL)
  return api.get(`/api/Users/me`).then(r => r.data)
}

export const createUser = (dto) => {
  console.debug('[api] POST /api/Users requesting baseURL=', api.defaults.baseURL, 'payload=', dto)
  return api.post(`/api/Users`, dto).then(r => r.data)
}

export const updateUser = (username, dto) => {
  console.debug('[api] PUT /api/Users/' + username + ' requesting baseURL=', api.defaults.baseURL, 'payload=', dto)
  return api.put(`/api/Users/${encodeURIComponent(username)}`, dto).then(r => r.data)
}

export const deactivateUser = (username) => {
  console.debug('[api] PUT /api/Users/' + username + '/deactivate requesting baseURL=', api.defaults.baseURL)
  return api.put(`/api/Users/${encodeURIComponent(username)}/deactivate`).then(r => r.data)
}
