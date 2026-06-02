import assert from 'node:assert/strict'
import test from 'node:test'
import {
  answerRoleFromEvidenceArtifacts,
  answerRoleFromEvidenceChunks,
  createEvidenceChunksFromText,
  evidenceChunkToArtifact,
} from './evidenceAuthority'

const uploadedAnchorOcr = `# MARKETING & CONTENT

| Role | Name | Email | Mobile | Notes |
|---|---|---|---|---|
| Social Director | Jack Jones | jackjones@pigpenpositiverocks.com | (615) 555-1101 | Social publishing |
| Tour Photographer | Eli Tran | elitran@pigpenpositiverocks.com | (615) 555-1105 | Tour capture |
| Vertical Content Team | Jack Jones | jackjones@pigpenpositiverocks.com | (615) 555-1106 | Reels + TikTok |

# SECURITY & SAFETY

| Role | Name | Email | Mobile | Notes |
|---|---|---|---|---|
| Head of Security | Marcus Stone | marcusstone@pigpenpositiverocks.com | (615) 555-1201 | Security coordination |`

test('answers Tour Photographer from an exact uploaded image OCR evidence row', () => {
  const chunks = createEvidenceChunksFromText({
    sourceFile: '1-Photo-1.jpg',
    extractedText: uploadedAnchorOcr,
  })

  const answer = answerRoleFromEvidenceChunks(chunks, 'Tour Photographer')

  assert.equal(answer?.answer, 'Tour Photographer: Eli Tran')
  assert.equal(answer?.sourceFile, '1-Photo-1.jpg')
  assert.equal(answer?.sourceSection, 'MARKETING & CONTENT')
  assert.equal(answer?.matchingText, '| Tour Photographer | Eli Tran | elitran@pigpenpositiverocks.com | (615) 555-1105 | Tour capture |')
  assert.match(answer?.evidenceChunkId ?? '', /^ev_/)
})

test('coalesces OCR-wrapped table rows before answering', () => {
  const chunks = createEvidenceChunksFromText({
    sourceFile: '1-Photo-1.jpg',
    extractedText: `# MARKETING & CONTENT

| Role | Name | Email | Mobile | Notes |
|---|---|---|---|---|
| Tour Photographer | Eli Tran |
elitran@pigpenpositiverocks.com | (615) 555-1105 | Tour
capture |
| Vertical Content Team | Jack Jones | jackjones@pigpenpositiverocks.com | (615) 555-1106 | Reels + TikTok |`,
  })

  const answer = answerRoleFromEvidenceChunks(chunks, 'Tour Photographer')

  assert.equal(answer?.answer, 'Tour Photographer: Eli Tran')
  assert.equal(answer?.matchingText, '| Tour Photographer | Eli Tran | elitran@pigpenpositiverocks.com | (615) 555-1105 | Tour capture |')
  assert.match(answer?.evidenceChunkId ?? '', /^ev_/)
})

test('answers from durable evidence chunk artifacts', () => {
  const chunks = createEvidenceChunksFromText({
    sourceFile: '1-Photo-1.jpg',
    extractedText: uploadedAnchorOcr,
  })
  const artifacts = chunks.map((chunk) => evidenceChunkToArtifact(chunk, '2026-06-02T00:00:00.000Z'))

  const answer = answerRoleFromEvidenceArtifacts(artifacts, 'Tour Photographer')

  assert.equal(answer?.answer, 'Tour Photographer: Eli Tran')
  assert.equal(answer?.sourceSection, 'MARKETING & CONTENT')
})

test('does not infer absent operational roles', () => {
  const chunks = createEvidenceChunksFromText({
    sourceFile: '1-Photo-1.jpg',
    extractedText: uploadedAnchorOcr,
  })

  assert.equal(answerRoleFromEvidenceChunks(chunks, 'Tour Manager'), null)
  assert.equal(answerRoleFromEvidenceChunks(chunks, 'Production Manager'), null)
})
