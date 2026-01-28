"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { FeedbackForm } from "./feedback-form"
import { getActiveSurvey, hasSubmittedFeedback } from "@/lib/actions/feedback"

interface FeedbackDialogProps {
    courseId: string
    courseTitle: string
    isOpen: boolean
    onClose: () => void
}

interface Survey {
    id: string
    title: string
    description: string | null
}

export function FeedbackDialog({
    courseId,
    courseTitle,
    isOpen,
    onClose
}: FeedbackDialogProps) {
    const [survey, setSurvey] = useState<Survey | null>(null)
    const [hasSubmitted, setHasSubmitted] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function loadSurvey() {
            if (!isOpen) return

            setIsLoading(true)
            const result = await getActiveSurvey(courseId)

            if (result.success && result.survey) {
                setSurvey(result.survey)

                // Check if already submitted
                const submittedResult = await hasSubmittedFeedback(result.survey.id)
                setHasSubmitted(submittedResult.hasSubmitted)
            }

            setIsLoading(false)
        }

        loadSurvey()
    }, [courseId, isOpen])

    if (!isOpen) return null

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogTitle className="sr-only">Feedback Survey</DialogTitle>
                {isLoading ? (
                    <div className="py-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                        <p className="text-gray-500 mt-4">Memuat survey...</p>
                    </div>
                ) : hasSubmitted ? (
                    <div className="py-12 text-center">
                        <div className="text-6xl mb-4">✅</div>
                        <h3 className="text-lg font-medium text-gray-800 mb-2">
                            Anda sudah mengisi feedback
                        </h3>
                        <p className="text-gray-500">
                            Terima kasih atas partisipasi Anda!
                        </p>
                    </div>
                ) : survey ? (
                    <FeedbackForm
                        surveyId={survey.id}
                        surveyTitle={survey.title}
                        surveyDescription={survey.description}
                        courseTitle={courseTitle}
                        onSuccess={onClose}
                    />
                ) : (
                    <div className="py-12 text-center">
                        <div className="text-6xl mb-4">📋</div>
                        <h3 className="text-lg font-medium text-gray-800 mb-2">
                            Belum ada survey
                        </h3>
                        <p className="text-gray-500">
                            Survey feedback belum tersedia untuk kursus ini.
                        </p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
