import api from '../api/client'

export async function listOwners(){
  const res = await api.get('/api/Owners')
  return res.data || []
}

export async function getOwner(nic){
  const res = await api.get(`/api/Owners/${nic}`)
  return res.data
}

// Use the public registration endpoint which creates both owner and a user account
export async function createOwner(dto){
  // map frontend form -> CreateOwnerRequest (PascalCase)
  const payload = {
    Nic: dto.nic,
    FullName: dto.fullName,
    Email: dto.email,
    Phone: dto.phone,
  }
  const res = await api.post('/api/Registration/owner', payload)
  return res.data
}

export async function updateOwner(nic, dto){
  // map frontend form -> UpdateOwnerRequest
  const payload = {
    FullName: dto.fullName,
    Email: dto.email,
    Phone: dto.phone,
    IsActive: dto.isActive ?? dto.active ?? true,
  }
  await api.put(`/api/Owners/${nic}`, payload)
}

export async function deactivateOwner(nic){
  // fetch existing owner and send full update payload with active=false to satisfy model validation
  const owner = await getOwner(nic)
  if(!owner) throw new Error('Owner not found')
  // owner may use PascalCase keys
  const payload = {
    FullName: owner.FullName ?? owner.fullName,
    Email: owner.Email ?? owner.email,
    Phone: owner.Phone ?? owner.phone,
    IsActive: false,
  }
  await api.put(`/api/Owners/${nic}`, payload)
}

export async function reactivateOwner(nic){
  const owner = await getOwner(nic)
  if(!owner) throw new Error('Owner not found')
  const payload = {
    FullName: owner.FullName ?? owner.fullName,
    Email: owner.Email ?? owner.email,
    Phone: owner.Phone ?? owner.phone,
    IsActive: true,
  }
  await api.put(`/api/Owners/${nic}`, payload)
}
