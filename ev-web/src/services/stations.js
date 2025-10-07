import * as api from '../api/stations'

const normalizeString = (v) => {
  if (v === null || v === undefined) return null
  try {
    const t = String(v).trim()
    return t === '' ? null : t
  } catch (e) {
    return null
  }
}

const mapFromApi = (s) => {
  // Accept both camelCase and PascalCase shapes from different backends/clients
  const id = s.id ?? s.ID ?? s.stationId ?? s.StationId
  // prefer any name-like field, trim whitespace and fall back to id when missing
  const rawName = s.name ?? s.Name ?? s.stationName ?? s.StationName
  const name = normalizeString(rawName) || id
  const rawAddress = s.address ?? s.Address ?? s.location ?? s.Location
  const address = normalizeString(rawAddress)
  return {
    id,
    name,
    address,
    latitude: s.latitude ?? s.Latitude,
    longitude: s.longitude ?? s.Longitude,
    type: s.type ?? s.Type,
    slots: s.slots ?? s.Slots ?? s.slotCount ?? s.SlotCount ?? 0,
    active: s.isActive ?? s.IsActive ?? s.active ?? true,
    // backend may include assigned operator in different casings
    assignedOperator: s.assignedOperator ?? s.AssignedOperator ?? s.assigned_operator ?? s.Assigned_Operator ?? null,
  }
}

export async function listStations(){
  const data = await api.listStations()
  if(!Array.isArray(data)){
    // Defensive: if server returned HTML (e.g. frontend route) or an object,
    // throw a helpful error instead of letting .map blow up with a TypeError.
    console.error('Unexpected stations response', data)
    throw new Error('Invalid response from stations API: expected array')
  }
  return data.map(mapFromApi)
}

export async function getStation(id){
  const s = await api.getStation(id)
  return mapFromApi(s)
}

export async function createStation(dto){
  const s = await api.createStation(dto)
  return mapFromApi(s)
}

export async function updateStation(id, dto){
  const s = await api.updateStation(id, dto)
  return mapFromApi(s)
}

export async function deactivateStation(id){
  // Some servers validate the full update DTO. To avoid 400 we fetch the
  // existing station, merge the isActive flag and send a full update payload.
  const existing = await api.getStation(id)
  const dto = {
    name: existing.name,
    address: existing.address,
    latitude: existing.latitude,
    longitude: existing.longitude,
    type: existing.type,
    slots: existing.slots,
    isActive: false,
  }
  const s = await api.updateStation(id, dto)
  return mapFromApi(s)
}

// Activate station by setting isActive=true using the update endpoint.
export async function activateStation(id){
  // Fetch the existing record and send full DTO with isActive=true to satisfy server validation
  const existing = await api.getStation(id)
  const dto = {
    name: existing.name,
    address: existing.address,
    latitude: existing.latitude,
    longitude: existing.longitude,
    type: existing.type,
    slots: existing.slots,
    isActive: true,
  }
  const s = await api.updateStation(id, dto)
  return mapFromApi(s)
}
