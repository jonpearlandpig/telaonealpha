import type { OperationalStateRecord } from './model'

export function explainState(state: OperationalStateRecord) {
  const reasoning = state.reasoningChain.length > 0
    ? state.reasoningChain.join(' -> ')
    : state.triggerDetail

  return {
    stateId: state.stateId,
    explanation: state.explanation ?? reasoning,
    derivationSource: state.derivationSource,
    reasoningChain: state.reasoningChain,
    dependencyLineage: state.dependencyChain,
    sourceEventIds: state.sourceEventIds ?? [],
  }
}
