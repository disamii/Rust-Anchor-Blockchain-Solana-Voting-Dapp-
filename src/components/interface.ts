export  type Role = 'superadmin' | 'admin' | 'voter'


export interface Candidate {
  name: string
  votes: number
}

export interface Poll {
  id: number
  title: string
  description: string
  start: number
  end: number
  candidates: Candidate[]
  status: 'upcoming' | 'active' | 'ended'
}

export interface Candidate {
  name: string
  votes: number
}

export interface Poll {
  id: number
  title: string
  description: string
  start: number
  end: number
  candidateAmount: number
  authority: string
  status: 'upcoming' | 'active' | 'ended'
}

export interface ApprovedCreator {
  wallet: string
  addedBy: string
  addedAt: string
}