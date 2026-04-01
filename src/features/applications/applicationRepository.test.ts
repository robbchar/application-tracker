import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as firestore from 'firebase/firestore'
import {
  listApplicationsByUser,
  createApplication,
  createApplicationsBulk,
  deleteAllApplicationsByUser,
  updateApplicationStatus,
  deleteApplication,
} from './applicationRepository'

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  doc: vi.fn(() => ({ id: 'mock-id' })),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn(),
  })),
  getFirestore: vi.fn(),
  Timestamp: {
    fromDate: vi.fn((date) => ({ toDate: () => date })),
  },
}))

describe('applicationRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('lists applications for a user', async () => {
    const mockData = {
      userId: 'user-123',
      position: 'Developer',
      company: 'TestCo',
      appliedDate: { toDate: () => new Date('2025-01-01') },
      status: 'applied',
      jobType: 'remote',
      links: [],
      location: '',
      notes: '',
    }

    const mockSnapshot = {
      docs: [
        {
          id: 'doc-1',
          data: () => mockData,
        },
      ],
    }

    vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any)

    const result = await listApplicationsByUser('user-123')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('doc-1')
    expect(result[0].company).toBe('TestCo')
    expect(firestore.query).toHaveBeenCalled()
    expect(firestore.where).toHaveBeenCalledWith('userId', '==', 'user-123')
  })

  it('creates an application', async () => {
    vi.mocked(firestore.addDoc).mockResolvedValue({ id: 'new-id' } as any)

    const input: any = {
      position: 'Engineer',
      company: 'AppCo',
      appliedDate: new Date(),
      status: 'interested',
      jobType: 'remote',
      links: [],
      location: '',
      notes: '',
    }

    const id = await createApplication('user-123', input)

    expect(id).toBe('new-id')
    expect(firestore.addDoc).toHaveBeenCalled()
  })

  it('updates an application status', async () => {
    vi.mocked(firestore.updateDoc).mockResolvedValue(undefined as any)

    await updateApplicationStatus('app-1', 'interview')

    expect(firestore.updateDoc).toHaveBeenCalledWith(expect.anything(), { status: 'interview' })
  })

  it('deletes an application', async () => {
    vi.mocked(firestore.deleteDoc).mockResolvedValue(undefined as any)

    await deleteApplication('app-1')

    expect(firestore.deleteDoc).toHaveBeenCalled()
  })

  it('creates applications in bulk', async () => {
    const inputs: any[] = [
      { company: 'Co1', position: 'P1', appliedDate: new Date() },
      { company: 'Co2', position: 'P2', appliedDate: new Date() },
    ]

    const ids = await createApplicationsBulk('user-123', inputs)

    expect(firestore.writeBatch).toHaveBeenCalled()
    expect(ids).toHaveLength(2)
  })

  it('deletes all applications for a user', async () => {
    const mockSnapshot = {
      empty: false,
      docs: [{ ref: 'ref-1' }, { ref: 'ref-2' }],
    }
    vi.mocked(firestore.getDocs).mockResolvedValue(mockSnapshot as any)

    await deleteAllApplicationsByUser('user-123')

    expect(firestore.writeBatch).toHaveBeenCalled()
    expect(firestore.query).toHaveBeenCalled()
  })
})
