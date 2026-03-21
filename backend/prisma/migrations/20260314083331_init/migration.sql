-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'RECRUITER', 'CANDIDATE');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RoundType" AS ENUM ('MCQ', 'CODING', 'INTERVIEW', 'MIXED');

-- CreateEnum
CREATE TYPE "InterviewMode" AS ENUM ('TEXT', 'AUDIO');

-- CreateEnum
CREATE TYPE "TimerMode" AS ENUM ('SHARED', 'PER_SLICE');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'CODING', 'INTERVIEW_PROMPT');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('LOCKED', 'INVITED', 'ONBOARDING', 'READY', 'IN_PROGRESS', 'COMPLETED', 'TERMINATED', 'DISQUALIFIED', 'SHORTLISTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'TERMINATED', 'TIMED_OUT');

-- CreateEnum
CREATE TYPE "ViolationType" AS ENUM ('PHONE_DETECTED', 'FACE_AWAY', 'MULTIPLE_FACES', 'TAB_SWITCH', 'FOCUS_LOSS', 'BACKGROUND_VOICE');

-- CreateEnum
CREATE TYPE "PoolStatus" AS ENUM ('GENERATING', 'READY', 'REGENERATING', 'DEPRECATED');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'BOUNCED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "department" TEXT,

    CONSTRAINT "AdminProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecruiterProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "department" TEXT,

    CONSTRAINT "RecruiterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "resumeUrl" TEXT,
    "resumeText" TEXT,
    "status" "CandidateStatus" NOT NULL DEFAULT 'LOCKED',
    "campaignId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JWTBlacklist" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JWTBlacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT,
    "jobDescription" TEXT NOT NULL,
    "jdFileUrl" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "expiresAt" TIMESTAMP(3),
    "maxCandidates" INTEGER,
    "adminId" TEXT NOT NULL,
    "pipelineConfig" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignRecruiter" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "recruiterId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignRecruiter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineRound" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "roundType" "RoundType" NOT NULL,
    "roundConfig" JSONB NOT NULL,
    "interviewMode" "InterviewMode",
    "timerMode" "TimerMode" NOT NULL DEFAULT 'SHARED',
    "timeLimitMinutes" INTEGER,
    "passMarkPercent" DOUBLE PRECISION,
    "failAction" TEXT NOT NULL DEFAULT 'MANUAL_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionPool" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "PoolStatus" NOT NULL DEFAULT 'GENERATING',
    "generatedBy" TEXT NOT NULL,
    "generationPrompt" TEXT,
    "generatedAt" TIMESTAMP(3),
    "adminApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "rejectedQIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "topicTag" TEXT,
    "order" INTEGER,
    "marksAwarded" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "stem" TEXT,
    "options" JSONB,
    "explanation" TEXT,
    "problemTitle" TEXT,
    "problemStatement" TEXT,
    "constraints" TEXT,
    "examples" JSONB,
    "testCases" JSONB,
    "starterCode" JSONB,
    "solutionCode" JSONB,
    "prompt" TEXT,
    "evaluationRubric" TEXT,
    "followUpPrompts" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateAttempt" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "assignedQuestionIds" TEXT[],
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "timeLimitMinutes" INTEGER,
    "strikeCount" INTEGER NOT NULL DEFAULT 0,
    "maxStrikes" INTEGER NOT NULL DEFAULT 3,
    "rawScore" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION,
    "percentScore" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MCQAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "isCorrect" BOOLEAN,
    "marksAwarded" DOUBLE PRECISION,
    "timeTakenSeconds" INTEGER,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MCQAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingSubmission" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "judge0Token" TEXT,
    "stdout" TEXT,
    "stderr" TEXT,
    "compileOutput" TEXT,
    "statusId" INTEGER,
    "statusDesc" TEXT,
    "timeTakenMs" DOUBLE PRECISION,
    "memoryUsedKb" DOUBLE PRECISION,
    "testCaseResults" JSONB,
    "testCasesPassed" INTEGER,
    "testCasesTotal" INTEGER,
    "marksAwarded" DOUBLE PRECISION,

    CONSTRAINT "CodingSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "mode" "InterviewMode" NOT NULL,
    "textAnswer" TEXT,
    "audioUrl" TEXT,
    "sttTranscript" TEXT,
    "sttConfidence" DOUBLE PRECISION,
    "aiScore" DOUBLE PRECISION,
    "aiReasoning" TEXT,
    "aiFollowUpAsked" TEXT,
    "aiFollowUpAnswer" TEXT,
    "timeTakenSeconds" INTEGER,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrikeEvent" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "violationType" "ViolationType" NOT NULL,
    "strikeNumber" INTEGER NOT NULL,
    "isStrike" BOOLEAN NOT NULL DEFAULT true,
    "screenshotUrl" TEXT,
    "mediapipeScore" DOUBLE PRECISION,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StrikeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptRecording" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "videoUrl" TEXT,
    "audioUrl" TEXT,
    "sttFullTranscript" TEXT,
    "sttFullConfidence" DOUBLE PRECISION,
    "mediapipeLog" JSONB NOT NULL DEFAULT '[]',
    "backgroundVoiceFlags" JSONB NOT NULL DEFAULT '[]',
    "durationSeconds" INTEGER,
    "videoSizeBytes" BIGINT,
    "audioSizeBytes" BIGINT,
    "recordingStartedAt" TIMESTAMP(3),
    "recordingEndedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttemptRecording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreCard" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "roundScores" JSONB NOT NULL DEFAULT '[]',
    "technicalFitPercent" DOUBLE PRECISION,
    "trustScore" DOUBLE PRECISION,
    "strikeDeduction" DOUBLE PRECISION,
    "completionBonus" DOUBLE PRECISION,
    "consistencyScore" DOUBLE PRECISION,
    "gapAnalysis" JSONB,
    "recruiterNotes" TEXT,
    "recruiterRating" INTEGER,
    "generatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScoreCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDING',
    "graphMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorRole" "Role",
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "AdminProfile_userId_key" ON "AdminProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RecruiterProfile_userId_key" ON "RecruiterProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateProfile_userId_key" ON "CandidateProfile"("userId");

-- CreateIndex
CREATE INDEX "CandidateProfile_campaignId_idx" ON "CandidateProfile"("campaignId");

-- CreateIndex
CREATE INDEX "CandidateProfile_status_idx" ON "CandidateProfile"("status");

-- CreateIndex
CREATE UNIQUE INDEX "JWTBlacklist_token_key" ON "JWTBlacklist"("token");

-- CreateIndex
CREATE INDEX "JWTBlacklist_token_idx" ON "JWTBlacklist"("token");

-- CreateIndex
CREATE INDEX "JWTBlacklist_expiresAt_idx" ON "JWTBlacklist"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");

-- CreateIndex
CREATE INDEX "Campaign_adminId_idx" ON "Campaign"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRecruiter_campaignId_recruiterId_key" ON "CampaignRecruiter"("campaignId", "recruiterId");

-- CreateIndex
CREATE INDEX "PipelineRound_campaignId_idx" ON "PipelineRound"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineRound_campaignId_order_key" ON "PipelineRound"("campaignId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionPool_roundId_key" ON "QuestionPool"("roundId");

-- CreateIndex
CREATE INDEX "QuestionPool_campaignId_idx" ON "QuestionPool"("campaignId");

-- CreateIndex
CREATE INDEX "QuestionPool_status_idx" ON "QuestionPool"("status");

-- CreateIndex
CREATE INDEX "Question_poolId_idx" ON "Question"("poolId");

-- CreateIndex
CREATE INDEX "Question_type_difficulty_idx" ON "Question"("type", "difficulty");

-- CreateIndex
CREATE INDEX "CandidateAttempt_candidateId_idx" ON "CandidateAttempt"("candidateId");

-- CreateIndex
CREATE INDEX "CandidateAttempt_campaignId_idx" ON "CandidateAttempt"("campaignId");

-- CreateIndex
CREATE INDEX "CandidateAttempt_status_idx" ON "CandidateAttempt"("status");

-- CreateIndex
CREATE INDEX "MCQAnswer_attemptId_idx" ON "MCQAnswer"("attemptId");

-- CreateIndex
CREATE INDEX "CodingSubmission_attemptId_idx" ON "CodingSubmission"("attemptId");

-- CreateIndex
CREATE INDEX "InterviewAnswer_attemptId_idx" ON "InterviewAnswer"("attemptId");

-- CreateIndex
CREATE INDEX "StrikeEvent_candidateId_idx" ON "StrikeEvent"("candidateId");

-- CreateIndex
CREATE INDEX "StrikeEvent_attemptId_idx" ON "StrikeEvent"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptRecording_attemptId_key" ON "AttemptRecording"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreCard_candidateId_key" ON "ScoreCard"("candidateId");

-- CreateIndex
CREATE INDEX "ScoreCard_campaignId_idx" ON "ScoreCard"("campaignId");

-- CreateIndex
CREATE INDEX "EmailLog_candidateId_idx" ON "EmailLog"("candidateId");

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_occurredAt_idx" ON "AuditLog"("occurredAt");

-- AddForeignKey
ALTER TABLE "AdminProfile" ADD CONSTRAINT "AdminProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterProfile" ADD CONSTRAINT "RecruiterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JWTBlacklist" ADD CONSTRAINT "JWTBlacklist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecruiter" ADD CONSTRAINT "CampaignRecruiter_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRecruiter" ADD CONSTRAINT "CampaignRecruiter_recruiterId_fkey" FOREIGN KEY ("recruiterId") REFERENCES "RecruiterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineRound" ADD CONSTRAINT "PipelineRound_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPool" ADD CONSTRAINT "QuestionPool_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionPool" ADD CONSTRAINT "QuestionPool_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "PipelineRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "QuestionPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateAttempt" ADD CONSTRAINT "CandidateAttempt_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCQAnswer" ADD CONSTRAINT "MCQAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "CandidateAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MCQAnswer" ADD CONSTRAINT "MCQAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingSubmission" ADD CONSTRAINT "CodingSubmission_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "CandidateAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingSubmission" ADD CONSTRAINT "CodingSubmission_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAnswer" ADD CONSTRAINT "InterviewAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "CandidateAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewAnswer" ADD CONSTRAINT "InterviewAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StrikeEvent" ADD CONSTRAINT "StrikeEvent_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptRecording" ADD CONSTRAINT "AttemptRecording_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "CandidateAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreCard" ADD CONSTRAINT "ScoreCard_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "CandidateProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
