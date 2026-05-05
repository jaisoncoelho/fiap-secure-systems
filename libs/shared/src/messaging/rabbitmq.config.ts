export const ANALYSIS_EXCHANGE = 'analysis_exchange';

export const ROUTING_KEYS = {
  ANALYSIS_REQUESTED: 'analysis.requested',
  ANALYSIS_STARTED: 'analysis.started',
  ANALYSIS_COMPLETED: 'analysis.completed',
  ANALYSIS_FAILED: 'analysis.failed',
} as const;

export type RoutingKey = (typeof ROUTING_KEYS)[keyof typeof ROUTING_KEYS];
