// xAPI Types based on ADL specification
// https://github.com/adlnet/xAPI-Spec

export interface XAPIActor {
    mbox: string // mailto:email@example.com format
    name?: string
    objectType?: "Agent" | "Group"
}

export interface XAPIVerb {
    id: string // IRI
    display: {
        [lang: string]: string
    }
}

export interface XAPIActivityDefinition {
    type?: string // IRI
    name?: {
        [lang: string]: string
    }
    description?: {
        [lang: string]: string
    }
    extensions?: Record<string, any>
}

export interface XAPIObject {
    id: string // IRI
    objectType?: "Activity" | "Agent" | "Group" | "StatementRef" | "SubStatement"
    definition?: XAPIActivityDefinition
}

export interface XAPIScore {
    scaled?: number // -1 to 1
    raw?: number
    min?: number
    max?: number
}

export interface XAPIResult {
    score?: XAPIScore
    success?: boolean
    completion?: boolean
    response?: string
    duration?: string // ISO 8601 duration
    extensions?: Record<string, any>
}

export interface XAPIContext {
    registration?: string // UUID
    instructor?: XAPIActor
    team?: XAPIActor
    platform?: string
    language?: string
    statement?: { id: string; objectType: "StatementRef" }
    contextActivities?: {
        parent?: XAPIObject[]
        grouping?: XAPIObject[]
        category?: XAPIObject[]
        other?: XAPIObject[]
    }
    extensions?: Record<string, any>
}

export interface XAPIStatement {
    id?: string // UUID, optional - LRS can generate
    actor: XAPIActor
    verb: XAPIVerb
    object: XAPIObject
    result?: XAPIResult
    context?: XAPIContext
    timestamp?: string // ISO 8601
}

export interface LRSConfig {
    endpoint: string
    apiKey: string
    secretKey: string
}

export interface SendStatementResult {
    success: boolean
    statementId?: string
    error?: string
}
