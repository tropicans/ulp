// KAP Data Types
// Separated from server actions to avoid bundling issues

export interface KAPData {
    courseTitle: string
    courseDescription: string // Summary
    courseFullDescription: string // Detailed background
    deliveryMode: "SYNC_ONLINE" | "ASYNC_ONLINE" | "ON_CLASSROOM" | "HYBRID"
    duration?: number // in hours (JP), optional
    advanceOrganizer: {
        title: string
        content: string
    }
    learningObjectives: string[]
    modules?: { // optional
        title: string
        lessons: string[]
    }[]
    conceptValidationQuestions: {
        id: string
        text: string
        options: { id: string; text: string }[]
        correctOptionId: string
    }[]
}
