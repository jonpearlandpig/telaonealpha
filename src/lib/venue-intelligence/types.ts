export type VenuePacketAsset = {
  name: string
  mimeType: string
  text: string
  base64Data?: string
}

export type VenueContact = {
  name: string
  role: string
  email?: string
  phone?: string
}

export type VenueDimension = {
  widthFt?: number
  depthFt?: number
  heightFt?: number
  trimFt?: number
}

export type VenueRiggingSpec = {
  pointsCount?: number
  maxPointLoadLbs?: number
  notes: string[]
}

export type VenuePowerSpec = {
  services: string[]
  shorePowerAvailable?: boolean
  notes: string[]
}

export type VenueLoadingSpec = {
  dockCount?: number
  driveInAccess?: boolean
  truckAccessNotes: string[]
}

export type VenueCapabilityBucket = {
  available: string[]
  missing: string[]
  notes: string[]
}

export type VenueRestriction = {
  category: string
  detail: string
  severity: 'low' | 'medium' | 'high'
}

export type VenueEntity = {
  id: string
  workspaceId: string
  name: string
  packetFileName: string
  sourceArtifactId: string
  packetText: string
  confidence: number
  profileSummary: string
  location?: string
  capacities: string[]
  stage: VenueDimension
  rigging: VenueRiggingSpec
  power: VenuePowerSpec
  loading: VenueLoadingSpec
  audio: VenueCapabilityBucket
  lighting: VenueCapabilityBucket
  video: VenueCapabilityBucket
  communications: VenueCapabilityBucket
  hospitality: VenueCapabilityBucket
  restrictions: VenueRestriction[]
  contacts: VenueContact[]
  rawFacts: string[]
  createdAt: string
  updatedAt: string
}

export type RiderRequirement = {
  id: string
  department: string
  title: string
  detail: string
  priority: 'critical' | 'high' | 'medium'
  keywords: string[]
}

export type ProductionRider = {
  id: string
  workspaceId: string
  title: string
  sourceArtifactId?: string
  isActive: boolean
  departments: string[]
  requirements: RiderRequirement[]
  createdAt: string
  updatedAt: string
}

export type RequirementCompatibility = {
  requirementId: string
  department: string
  title: string
  detail: string
  status: 'supported' | 'partial' | 'missing' | 'unknown'
  confidence: number
  evidence: string[]
  issue?: string
}

export type VenueIssue = {
  id: string
  title: string
  detail: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  department: string
  requirementId?: string
}

export type CompatibilityReport = {
  status: 'ready' | 'watch' | 'risk'
  summary: string
  supportedCount: number
  partialCount: number
  missingCount: number
  unknownCount: number
  requirementResults: RequirementCompatibility[]
}

export type VenueAssessment = {
  id: string
  workspaceId: string
  venueId: string
  riderId: string
  venueProfile: {
    title: string
    summary: string
    highlights: string[]
  }
  compatibilityReport: CompatibilityReport
  openIssues: VenueIssue[]
  readinessScore: number
  createdAt: string
  updatedAt: string
}
