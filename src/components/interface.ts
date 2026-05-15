export  type Role = 'superadmin' | 'admin' | 'voter'

export  interface Poll {
  id: number
  title: string
  description: string
  start: number // unix ms
  end: number // unix ms
  candidates: { name: string; votes: number }[]
  status: 'active' | 'upcoming' | 'ended'
}

export interface ApprovedCreator {
  wallet: string
  addedAt: string
  polls: number
}
