export type ContinuityType = 'Update' | 'Decision' | 'Venue Memory' | 'Staffing Alert' | 'Touring Note' | 'Approval' | 'Risk' | 'Blocker'

export type ContinuityCard = {
  id: string
  type: ContinuityType
  department: string
  owner: string
  timestamp: string
  unresolved: boolean
  headline: string
  summary: string
  image?: string
  acknowledged: number
}

export type OpsDepartment = {
  id: string
  name: string
  unresolvedCount: number
  active: boolean
  latest: string
}
