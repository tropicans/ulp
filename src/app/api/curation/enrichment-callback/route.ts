import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Callback API endpoint for n8n curation enrichment workflow
 * Receives enriched course data and updates the database
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            courseId,
            sessionId,
            title,
            description,
            shortDescription,
            requirements,
            outcomes,
            metaKeys,
            metaDesc,
            recommendedNext,
            courseLevel,
            quizPrepost,
            quizPrepostCount,
        } = body;

        if (!courseId) {
            return NextResponse.json({ error: "courseId is required" }, { status: 400 });
        }

        // Update course with enriched data
        await prisma.course.update({
            where: { id: courseId },
            data: {
                ...(title && { title }),
                ...(description && { description }),
                ...(shortDescription && { courseShortDesc: shortDescription }),
                ...(requirements && { requirements: JSON.stringify(requirements) }),
                ...(outcomes && { outcomes: JSON.stringify(outcomes) }),
                ...(metaKeys && { tags: Array.isArray(metaKeys) ? metaKeys : [] }),
                ...(recommendedNext && { recommendedNext: JSON.stringify(recommendedNext) }),
                ...(courseLevel && { courseLevel }),
                updatedAt: new Date(),
            },
        });

        // Create pretest/posttest quiz if provided
        if (quizPrepost && courseId) {
            const course = await prisma.course.findUnique({
                where: { id: courseId },
                include: { Module: { take: 1 } },
            });

            if (course?.Module?.[0]) {
                const moduleId = course.Module[0].id;

                // Check if prepost quiz already exists
                const existingQuiz = await prisma.quiz.findFirst({
                    where: {
                        moduleId,
                        type: "PRETEST",
                    },
                });

                if (!existingQuiz) {
                    // Parse Aiken format and create quiz
                    const questions = parseAikenFormat(quizPrepost);

                    if (questions.length > 0) {
                        const quiz = await prisma.quiz.create({
                            data: {
                                id: crypto.randomUUID(),
                                title: "Pre-test / Post-test",
                                description: "Quiz untuk mengukur pemahaman sebelum dan sesudah mengikuti kursus",
                                moduleId,
                                type: "PRETEST",
                                passingScore: 70,
                                maxAttempts: 3,
                                shuffleQuestions: true,
                                shuffleOptions: true,
                                isAIGenerated: true,
                                updatedAt: new Date(),
                            },
                        });

                        // Create questions
                        for (let i = 0; i < questions.length; i++) {
                            const q = questions[i];
                            await prisma.question.create({
                                data: {
                                    id: crypto.randomUUID(),
                                    quizId: quiz.id,
                                    type: "MULTIPLE_CHOICE",
                                    text: q.question,
                                    order: i + 1,
                                    points: 1,
                                    options: q.options,
                                },
                            });
                        }
                    }
                }
            }
        }

        // Update session enrichment status
        if (sessionId) {
            await prisma.ytCurationSession.update({
                where: { id: sessionId },
                data: {
                    enrichmentStatus: "completed",
                    updatedAt: new Date(),
                },
            });
        } else {
            // Find session by enrichedCourseId
            await prisma.ytCurationSession.updateMany({
                where: { enrichedCourseId: courseId },
                data: {
                    enrichmentStatus: "completed",
                    updatedAt: new Date(),
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: "Course enriched successfully",
            courseId,
        });
    } catch (error: any) {
        console.error("Enrichment callback error:", error);

        // Try to update enrichment status to failed
        try {
            const body = await request.clone().json();
            if (body.courseId) {
                await prisma.ytCurationSession.updateMany({
                    where: { enrichedCourseId: body.courseId },
                    data: { enrichmentStatus: "failed" },
                });
            }
        } catch { }

        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}

/**
 * Parse Aiken format quiz into structured questions
 * Format:
 * Question text
 * A. Option A
 * B. Option B
 * C. Option C
 * D. Option D
 * ANSWER: A
 */
function parseAikenFormat(aikenText: string): Array<{
    question: string;
    options: { A: string; B: string; C: string; D: string; correctIndex: number };
}> {
    const questions: Array<{
        question: string;
        options: { A: string; B: string; C: string; D: string; correctIndex: number };
    }> = [];

    // Split by double newline or ANSWER: pattern to separate questions
    const blocks = aikenText.split(/\n(?=ANSWER:)/i);
    let currentQuestion = "";
    let currentOptions: { A: string; B: string; C: string; D: string } = { A: "", B: "", C: "", D: "" };
    let lines: string[] = [];

    // Re-join and process line by line
    const allLines = aikenText.split("\n").map(l => l.trim()).filter(Boolean);

    for (let i = 0; i < allLines.length; i++) {
        const line = allLines[i];

        if (line.match(/^A\.\s*/i)) {
            currentOptions.A = line.replace(/^A\.\s*/i, "");
        } else if (line.match(/^B\.\s*/i)) {
            currentOptions.B = line.replace(/^B\.\s*/i, "");
        } else if (line.match(/^C\.\s*/i)) {
            currentOptions.C = line.replace(/^C\.\s*/i, "");
        } else if (line.match(/^D\.\s*/i)) {
            currentOptions.D = line.replace(/^D\.\s*/i, "");
        } else if (line.match(/^ANSWER:\s*([A-D])/i)) {
            const match = line.match(/^ANSWER:\s*([A-D])/i);
            const answer = match?.[1]?.toUpperCase() || "A";
            const correctIndex = ["A", "B", "C", "D"].indexOf(answer);

            if (currentQuestion && currentOptions.A) {
                questions.push({
                    question: currentQuestion,
                    options: { ...currentOptions, correctIndex },
                });
            }

            // Reset for next question
            currentQuestion = "";
            currentOptions = { A: "", B: "", C: "", D: "" };
        } else {
            // This is a question line
            if (!currentOptions.A) {
                currentQuestion = currentQuestion ? `${currentQuestion} ${line}` : line;
            }
        }
    }

    return questions;
}
