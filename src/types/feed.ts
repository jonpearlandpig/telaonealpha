export type ContinuityType = 'Update' | 'Decision' | 'Venue Memory' | 'Staffing Note' | 'Touring Note' | 'Approval' | 'Risk' | 'Unresolved'

export type ContinuityCard = {
  id: string
  type: ContinuityType
  department: string
  owner: string
  timestamp: string
  unresolved: boolean
  pinned?: boolean
  headline: string
  summary: string
  image?: string
  acknowledged: number
  source: string
}

export type OpsDepartment = {
  id: string
  name: string
  unresolvedCount: number
  active: boolean
  latest: string
}
