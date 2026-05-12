import Anthropic from '@anthropic-ai/sdk'
import { TELA_SYSTEM_PROMPT } from './constants'

let _client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set in environment variables')
    _client = new Anthropic({ apiKey })
  }
  return _client
}

export function buildSystemPrompt(wikiContext: string): string {
  return TELA_SYSTEM_PROMPT.replace('{WIKI_CONTEXT}', wikiContext || 'No wiki context loaded. Sync to load operational data.')
}

export const MODEL = 'claude-sonnet-4-6'
