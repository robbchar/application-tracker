export type JobType = 'hybrid' | 'onsite' | 'remote'

export type ApplicationStatus =
  | 'interested'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'archived'

export type Link = {
  title?: string
  url: string
}

export interface Application {
  id: string
  userId: string
  position: string
  company: string
  appliedDate: Date
  location: string
  jobType: JobType
  status: ApplicationStatus
  notes: string
  links: Link[]
}

export interface ApplicationInput {
  position: string
  company: string
  appliedDate: Date
  location: string
  jobType: JobType
  status: ApplicationStatus
  notes: string
  links: Link[]
}


