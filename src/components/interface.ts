export  type Role = 'superadmin' | 'institution_admin' | 'voter'


export interface Candidate {
  name: string
  votes: number
}


export interface Admin {
  wallet: string
  addedBy: string
  addedAt: string
}


export interface Institution {
  publicKey: string
  institutionId: number
  name: string
  admin: string
  policy: string
  createdAt: string
  isActive: boolean
  isApproved: boolean
  approvedBy: string
  approvedAt: string | null
}
// interface.ts
export interface Poll {
  id: number
  title: string
  description: string
  start: number
  end: number
  candidateAmount: number
  authority: string
  institution: string      // PDA pubkey string
  institutionId: number    // ← ADD THIS
  status: 'upcoming' | 'active' | 'ended'
  candidates: Candidate[]
}