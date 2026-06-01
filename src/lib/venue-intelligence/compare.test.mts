import test from 'node:test'
import assert from 'node:assert/strict'
import { buildVenueAssessment } from './compare'
import { parseMarkdownRider } from './rider'

test('parseMarkdownRider extracts departments and requirements', () => {
  const rider = parseMarkdownRider(`# TOUR RIDER

## AUDIO DEPARTMENT
- FOH Engineer — house mix and system tuning

## LIGHTING DEPARTMENT
- Lighting Director — cue execution
`)

  assert.equal(rider.departments.length, 2)
  assert.equal(rider.requirements.length, 2)
  assert.equal(rider.requirements[0]?.department, 'AUDIO')
  assert.equal(rider.requirements[0]?.title, 'FOH Engineer')
})

test('buildVenueAssessment flags missing rider support', () => {
  const rider = parseMarkdownRider(`# TOUR RIDER

## AUDIO DEPARTMENT
- FOH Engineer — house mix and system tuning

## SECURITY DEPARTMENT
- Emergency Coordinator — incident chain
`, { workspaceId: 'ws-1' })

  const assessment = buildVenueAssessment({
    workspaceId: 'ws-1',
    rider,
    venue: {
      id: 'venue:test-hall',
      workspaceId: 'ws-1',
      name: 'Test Hall',
      packetFileName: 'test.pdf',
      sourceArtifactId: 'artifact:test',
      packetText: 'House audio console with FOH position.',
      confidence: 0.8,
      profileSummary: 'Audio is documented, emergency support is not.',
      capacities: [],
      stage: {},
      rigging: { notes: [] },
      power: { services: [], notes: [] },
      loading: { truckAccessNotes: [] },
      audio: { available: ['House audio console at FOH position'], missing: [], notes: [] },
      lighting: { available: [], missing: [], notes: [] },
      video: { available: [], missing: [], notes: [] },
      communications: { available: [], missing: [], notes: [] },
      hospitality: { available: [], missing: [], notes: [] },
      restrictions: [],
      contacts: [],
      rawFacts: [],
      createdAt: '2026-05-31T00:00:00.000Z',
      updatedAt: '2026-05-31T00:00:00.000Z',
    },
  })

  assert.equal(
    assessment.compatibilityReport.supportedCount + assessment.compatibilityReport.partialCount >= 1,
    true,
  )
  assert.equal(assessment.openIssues.length >= 1, true)
  assert.equal(assessment.readinessScore < 100, true)
})
