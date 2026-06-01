import type { ProductionRider, RiderRequirement } from './types'

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function classifyPriority(text: string, department: string): RiderRequirement['priority'] {
  const source = `${department} ${text}`.toLowerCase()
  if (/(security|medic|emergency|rigging|power|rf|wireless)/.test(source)) return 'critical'
  if (/(audio|lighting|video|stage|transport)/.test(source)) return 'high'
  return 'medium'
}

function keywordize(text: string) {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 3),
    ),
  )
}

export function parseMarkdownRider(text: string, input?: {
  id?: string
  workspaceId?: string
  title?: string
  sourceArtifactId?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}): ProductionRider {
  const lines = text.split('\n')
  const departments = new Set<string>()
  const requirements: RiderRequirement[] = []
  let title = input?.title?.trim() || ''
  let currentDepartment = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (!title && trimmed.startsWith('# ')) {
      title = trimmed.slice(2).trim()
      continue
    }

    if (/^#{2,3}\s/.test(trimmed)) {
      currentDepartment = trimmed
        .replace(/^#+\s+/, '')
        .replace(/\s+DEPARTMENT$/i, '')
        .trim()
      if (currentDepartment) departments.add(currentDepartment)
      continue
    }

    if (!currentDepartment || (!trimmed.startsWith('- ') && !trimmed.startsWith('* '))) continue

    const content = trimmed.slice(2).trim()
    const separators = [' — ', ' – ', ' - ', ': ']
    let requirementTitle = content
    let requirementDetail = ''

    for (const separator of separators) {
      const index = content.indexOf(separator)
      if (index > 0) {
        requirementTitle = content.slice(0, index).trim()
        requirementDetail = content.slice(index + separator.length).trim()
        break
      }
    }

    const combined = `${requirementTitle} ${requirementDetail}`.trim()
    requirements.push({
      id: `rider:${slugify(`${currentDepartment}-${requirementTitle}`)}`,
      department: currentDepartment,
      title: requirementTitle,
      detail: requirementDetail,
      priority: classifyPriority(combined, currentDepartment),
      keywords: keywordize(`${currentDepartment} ${combined}`),
    })
  }

  const now = input?.createdAt ?? new Date().toISOString()
  const riderTitle = title || 'Production Rider'

  return {
    id: input?.id ?? `rider:${slugify(riderTitle)}`,
    workspaceId: input?.workspaceId ?? 'tela-showtela',
    title: riderTitle,
    sourceArtifactId: input?.sourceArtifactId,
    isActive: input?.isActive ?? true,
    departments: [...departments],
    requirements,
    createdAt: now,
    updatedAt: input?.updatedAt ?? now,
  }
}
