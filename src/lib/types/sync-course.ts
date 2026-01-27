// Sync Course Types
// Separated from server actions to avoid bundling issues

export interface SyncCourseConfig {
    advanceOrganizer: {
        title: string
        content: string // HTML or Markdown
        videoUrl?: string
    }
    learningFocus: string[] // Array of focus points
    youtubeStreamUrl: string
    conceptValidation: {
        questions: {
            id: string
            text: string
            options: { id: string; text: string }[]
            correctOptionId: string
        }[]
    }
}

export interface ConceptMarker {
    timestamp: string
    text: string
    createdAt: string
}

export interface ValidationResponse {
    questionId: string
    selectedOptionId: string
}
