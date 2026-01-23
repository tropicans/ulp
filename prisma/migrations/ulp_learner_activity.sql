-- ULP Retrofit Migration: Learner Activity Table
CREATE TABLE IF NOT EXISTS learner_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    course_id VARCHAR(255),
    activity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    entity_title VARCHAR(500),
    metadata JSONB,
    occurred_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_user_course ON learner_activity(user_id, course_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_activity_user ON learner_activity(user_id, occurred_at);

-- Add foreign key constraint (optional, may fail if User table has different id format)
-- ALTER TABLE learner_activity ADD CONSTRAINT fk_learner_activity_user FOREIGN KEY (user_id) REFERENCES "User"(id) ON DELETE CASCADE;
