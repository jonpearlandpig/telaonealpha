import Anthropic from '@anthropic-ai/sdk'
import { TELA_SYSTEM_PROMPT } from './constants'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export function buildSystemPrompt(wikiContext: string): string {
  return TELA_SYSTEM_PROMPT.replace('{WIKI_CONTEXT}', wikiContext || 'No wiki context loaded. Sync to load operational data.')
}

export const MODEL = 'claude-sonnet-4-6'
