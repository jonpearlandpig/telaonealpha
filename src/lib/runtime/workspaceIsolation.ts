export function assertWorkspace(workspaceId?: string): string {
  return workspaceId?.trim() || 'default-workspace'
}

export function scopedKey(workspaceId: string, key: string): string {
  return `${workspaceId}:${key}`
}
