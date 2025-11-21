import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  writeBatch,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type {
  Application,
  ApplicationInput,
  Link,
  ApplicationStatus,
  JobType,
} from '@/types/application'

const COLLECTION_NAME = 'application-tracker'

type ApplicationDocument = {
  userId: string
  position: string
  company: string
  appliedDate: Timestamp
  location: string
  jobType: JobType
  status: ApplicationStatus
  notes: string
  links: Link[]
}

const applicationsCollection = collection(db, COLLECTION_NAME)

export const listApplicationsByUser = async (userId: string): Promise<Application[]> => {
  const q = query(
    applicationsCollection,
    where('userId', '==', userId),
    orderBy('appliedDate', 'desc'),
  )

  const snapshot = await getDocs(q)

  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data() as ApplicationDocument

    return {
      id: docSnapshot.id,
      userId: data.userId,
      position: data.position,
      company: data.company,
      appliedDate: data.appliedDate.toDate(),
      location: data.location,
      jobType: data.jobType,
      status: data.status,
      notes: data.notes,
      links: data.links ?? [],
    }
  })
}

export const createApplication = async (
  userId: string,
  input: ApplicationInput,
): Promise<string> => {
  const docToCreate: ApplicationDocument = {
    userId,
    position: input.position,
    company: input.company,
    appliedDate: Timestamp.fromDate(input.appliedDate),
    location: input.location,
    jobType: input.jobType,
    status: input.status,
    notes: input.notes,
    links: input.links,
  }

  const docRef = await addDoc(applicationsCollection, docToCreate)
  return docRef.id
}

export const createApplicationsBulk = async (
  userId: string,
  inputs: ApplicationInput[],
): Promise<string[]> => {
  if (inputs.length === 0) return []

  const batch = writeBatch(db)
  const createdIds: string[] = []

  for (const input of inputs) {
    const docRef = doc(applicationsCollection)
    createdIds.push(docRef.id)

    const docToCreate: ApplicationDocument = {
      userId,
      position: input.position,
      company: input.company,
      appliedDate: Timestamp.fromDate(input.appliedDate),
      location: input.location,
      jobType: input.jobType,
      status: input.status,
      notes: input.notes,
      links: input.links,
    }

    batch.set(docRef, docToCreate)
  }

  await batch.commit()
  return createdIds
}

export const updateApplication = async (
  id: string,
  input: Partial<ApplicationInput>,
): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id)

  const updatePayload: Partial<ApplicationDocument> = {
    ...('position' in input && { position: input.position }),
    ...('company' in input && { company: input.company }),
    ...('appliedDate' in input &&
      input.appliedDate && { appliedDate: Timestamp.fromDate(input.appliedDate) }),
    ...('location' in input && { location: input.location }),
    ...('jobType' in input && { jobType: input.jobType as JobType }),
    ...('status' in input && { status: input.status as ApplicationStatus }),
    ...('notes' in input && { notes: input.notes }),
    ...('links' in input && { links: input.links as Link[] }),
  }

  await updateDoc(docRef, updatePayload)
}

export const updateApplicationStatus = async (
  id: string,
  status: ApplicationStatus,
): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id)
  await updateDoc(docRef, { status })
}

export const deleteApplication = async (id: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, id)
  await deleteDoc(docRef)
}
