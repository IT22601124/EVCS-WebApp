import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

// Mock services
vi.mock('../../services/users', () => ({
  listUsers: vi.fn(),
  createUser: vi.fn(),
  deactivateUser: vi.fn(),
  activateUser: vi.fn(),
}))
vi.mock('../../services/stations', () => ({
  listStations: vi.fn(),
}))
vi.mock('../../services/operatorAssignments', () => ({
  getAssignments: vi.fn(),
  assignOperatorToStation: vi.fn(),
  unassignOperator: vi.fn(),
}))

import * as usersSvc from '../../services/users'
import * as stationsSvc from '../../services/stations'
import * as assignSvc from '../../services/operatorAssignments'
import Users from '../Users'

const sampleStations = [
  { id: 'st-1', name: 'Station One', type: 'Fast', isActive: true },
  { id: 'st-2', name: 'Station Two', type: 'Slow', isActive: true },
]
const sampleUsers = [
  { username: 'op_1', role: 'Operator', isActive: true },
  { username: 'back_1', role: 'Backoffice', isActive: true },
]
const sampleAssign = { 'st-1': ['op_1'] }

describe('Users page edit/save and deactivate', () => {
  beforeEach(() => {
    usersSvc.listUsers.mockResolvedValue(sampleUsers)
    stationsSvc.listStations.mockResolvedValue(sampleStations)
    assignSvc.getAssignments.mockReturnValue(sampleAssign)
    usersSvc.deactivateUser.mockResolvedValue({})
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('opens modal, edits assignment, saves and deactivates', async () => {
    render(<Users />)

    // wait for users to load
    await waitFor(() => expect(usersSvc.listUsers).toHaveBeenCalled())

    // click on operator row to open modal
    const row = await screen.findByText('op_1')
    await userEvent.click(row)

    // modal should show
    expect(screen.getByText('User details')).toBeInTheDocument()

    // click Edit assignment
    const editBtn = screen.getByRole('button', { name: /Edit assignment/i })
    await userEvent.click(editBtn)

    // select a new station
    const select = screen.getByRole('combobox')
    await userEvent.selectOptions(select, 'st-2')

    // click Save
    const saveBtn = screen.getByRole('button', { name: /Save/i })
    await userEvent.click(saveBtn)

    // assignment helper should be called
    await waitFor(() => expect(assignSvc.assignOperatorToStation).toHaveBeenCalledWith('st-2', 'op_1'))

    // now deactivate
    const deactivateBtn = screen.getByRole('button', { name: /Deactivate/i })
    await userEvent.click(deactivateBtn)

    await waitFor(() => expect(usersSvc.deactivateUser).toHaveBeenCalledWith('op_1'))
  })
})
