// Standard xAPI Verbs from ADL Registry
// https://registry.tincanapi.com/

import { XAPIVerb } from "./types"

// Base IRI for ADL verbs
const ADL_VERBS = "http://adlnet.gov/expapi/verbs"

export const VERBS = {
    // Learning Events
    enrolled: {
        id: `${ADL_VERBS}/registered`,
        display: { en: "enrolled", id: "mendaftar" }
    } as XAPIVerb,

    launched: {
        id: `${ADL_VERBS}/launched`,
        display: { en: "launched", id: "memulai" }
    } as XAPIVerb,

    attempted: {
        id: `${ADL_VERBS}/attempted`,
        display: { en: "attempted", id: "mencoba" }
    } as XAPIVerb,

    completed: {
        id: `${ADL_VERBS}/completed`,
        display: { en: "completed", id: "menyelesaikan" }
    } as XAPIVerb,

    passed: {
        id: `${ADL_VERBS}/passed`,
        display: { en: "passed", id: "lulus" }
    } as XAPIVerb,

    failed: {
        id: `${ADL_VERBS}/failed`,
        display: { en: "failed", id: "tidak lulus" }
    } as XAPIVerb,

    // Progress
    progressed: {
        id: `${ADL_VERBS}/progressed`,
        display: { en: "progressed", id: "melanjutkan" }
    } as XAPIVerb,

    // Interaction
    answered: {
        id: `${ADL_VERBS}/answered`,
        display: { en: "answered", id: "menjawab" }
    } as XAPIVerb,

    // Achievement
    earned: {
        id: "http://id.tincanapi.com/verb/earned",
        display: { en: "earned", id: "mendapatkan" }
    } as XAPIVerb,

    // Video
    played: {
        id: "https://w3id.org/xapi/video/verbs/played",
        display: { en: "played", id: "memutar" }
    } as XAPIVerb,

    paused: {
        id: "https://w3id.org/xapi/video/verbs/paused",
        display: { en: "paused", id: "menjeda" }
    } as XAPIVerb,

    seeked: {
        id: "https://w3id.org/xapi/video/verbs/seeked",
        display: { en: "seeked", id: "mencari" }
    } as XAPIVerb,
}

// Activity Types
export const ACTIVITY_TYPES = {
    course: "http://adlnet.gov/expapi/activities/course",
    module: "http://adlnet.gov/expapi/activities/module",
    lesson: "http://adlnet.gov/expapi/activities/lesson",
    assessment: "http://adlnet.gov/expapi/activities/assessment",
    question: "http://adlnet.gov/expapi/activities/cmi.interaction",
    video: "https://w3id.org/xapi/video/activity-type/video",
    certificate: "http://id.tincanapi.com/activitytype/certificate",
}

// Platform IRI - use official domain
export const PLATFORM_IRI = "https://titian.setneg.go.id"
export const PLATFORM_NAME = "TITIAN LXP"
