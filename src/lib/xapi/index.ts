// xAPI Module Exports
export * from "./types"
export * from "./verbs"
export { sendStatement, sendStatementAsync } from "./service"
export { buildActor, buildActivity, buildResult, genIdempotencyKey } from "./utils"
export { queueStatement, recordActivity } from "./outbox"
export { evaluatePolicies, registerPolicy } from "./orchestrator"
export { processOutbox, getOutboxStats, retryDLQ } from "./worker"

// Side effects like registerPolicy at the top level can cause build issues in Next.js
// Evaluation logic in orchestrator.ts now handles lazy initialization.

