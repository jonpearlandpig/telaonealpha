import { TELA_SYSTEM_PROMPT } from './constants'
import { getClaudeClient } from './ai/claude'

export function getAnthropicClient() {
  return getClaudeClient()
}

export function buildSystemPrompt(wikiContext: string): string {
  return TELA_SYSTEM_PROMPT.replace('{WIKI_CONTEXT}', wikiContext || 'No wiki context loaded. Sync to load operational data.')
}

export const MODEL = 'claude-sonnet-4-20250514'
