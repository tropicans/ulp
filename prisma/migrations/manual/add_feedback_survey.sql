-- CreateTable: FeedbackSurvey
CREATE TABLE IF NOT EXISTS "feedback_surveys" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "session_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable: FeedbackResponse
CREATE TABLE IF NOT EXISTS "feedback_responses" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "instructor_rating" INTEGER,
    "material_rating" INTEGER,
    "facility_rating" INTEGER,
    "overall_rating" INTEGER NOT NULL,
    "strengths" TEXT,
    "improvements" TEXT,
    "suggestions" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "feedback_surveys_course_id_idx" ON "feedback_surveys"("course_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "feedback_responses_survey_id_idx" ON "feedback_responses"("survey_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "feedback_responses_survey_id_user_id_key" ON "feedback_responses"("survey_id", "user_id");

-- AddForeignKey
ALTER TABLE "feedback_surveys" ADD CONSTRAINT "feedback_surveys_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_surveys" ADD CONSTRAINT "feedback_surveys_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "CourseSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "feedback_surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_responses" ADD CONSTRAINT "feedback_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
