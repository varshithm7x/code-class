/*
  Warnings:

  - You are about to drop the `_AssignmentToProblem` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `assignmentId` to the `Problem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TestStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'TERMINATED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'JUDGING', 'ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILATION_ERROR', 'SYSTEM_ERROR');

-- CreateEnum
CREATE TYPE "PenaltyType" AS ENUM ('TAB_SWITCH', 'FULLSCREEN_EXIT', 'VISIBILITY_CHANGE', 'COPY_ATTEMPT', 'PASTE_ATTEMPT', 'FOCUS_LOST', 'SUSPICIOUS_ACTIVITY');

-- CreateEnum
CREATE TYPE "ViolationType" AS ENUM ('TAB_SWITCH', 'FULLSCREEN_EXIT', 'COPY_PASTE', 'DEV_TOOLS', 'FOCUS_LOSS', 'CONTEXT_MENU');

-- CreateEnum
CREATE TYPE "PenaltyLevel" AS ENUM ('WARNING', 'MINOR', 'MAJOR', 'TERMINATION');

-- DropForeignKey
ALTER TABLE "_AssignmentToProblem" DROP CONSTRAINT "_AssignmentToProblem_A_fkey";

-- DropForeignKey
ALTER TABLE "_AssignmentToProblem" DROP CONSTRAINT "_AssignmentToProblem_B_fkey";

-- DropIndex
DROP INDEX "Problem_url_key";

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "lastSubmissionCheck" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "assignmentId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "manuallyMarked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "geminiApiKey" TEXT,
ADD COLUMN     "geminiKeyStatus" TEXT NOT NULL DEFAULT 'NOT_PROVIDED',
ADD COLUMN     "hackerrankCookie" TEXT,
ADD COLUMN     "hackerrankCookieStatus" TEXT NOT NULL DEFAULT 'NOT_LINKED',
ADD COLUMN     "judge0ApiKey" TEXT,
ADD COLUMN     "judge0KeyStatus" TEXT NOT NULL DEFAULT 'NOT_PROVIDED',
ADD COLUMN     "judge0LastReset" TIMESTAMP(3),
ADD COLUMN     "judge0QuotaUsed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "leetcodeCookie" TEXT,
ADD COLUMN     "leetcodeCookieStatus" TEXT NOT NULL DEFAULT 'NOT_LINKED',
ADD COLUMN     "leetcodeEasySolved" INTEGER,
ADD COLUMN     "leetcodeHardSolved" INTEGER,
ADD COLUMN     "leetcodeMediumSolved" INTEGER,
ADD COLUMN     "leetcodeTotalSolved" INTEGER;

-- DropTable
DROP TABLE "_AssignmentToProblem";

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodingTest" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "duration" INTEGER NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "allowedLanguages" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestProblem" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "constraints" TEXT,
    "examples" JSONB NOT NULL,
    "testCases" JSONB NOT NULL,
    "difficulty" TEXT NOT NULL,
    "timeLimit" INTEGER NOT NULL,
    "memoryLimit" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestProblem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSession" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "status" "TestStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "penaltyCount" INTEGER NOT NULL DEFAULT 0,
    "totalPenalties" INTEGER NOT NULL DEFAULT 0,
    "scoreReduction" INTEGER NOT NULL DEFAULT 0,
    "timePenalty" INTEGER NOT NULL DEFAULT 0,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentProblemIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSubmission" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "score" INTEGER,
    "executionTime" INTEGER,
    "memoryUsed" INTEGER,
    "judgeOutput" JSONB,
    "judgeToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestPenalty" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "PenaltyType" NOT NULL,
    "violationType" "ViolationType" NOT NULL,
    "penaltyLevel" "PenaltyLevel" NOT NULL,
    "description" TEXT NOT NULL,
    "details" JSONB,
    "scoreReduction" INTEGER NOT NULL DEFAULT 0,
    "timePenalty" INTEGER NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestPenalty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Judge0KeyPool" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "dailyUsage" INTEGER NOT NULL DEFAULT 0,
    "dailyLimit" INTEGER NOT NULL DEFAULT 50,
    "lastUsed" TIMESTAMP(3),
    "lastReset" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Judge0KeyPool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TestSession_testId_userId_key" ON "TestSession"("testId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Judge0KeyPool_userId_key" ON "Judge0KeyPool"("userId");

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodingTest" ADD CONSTRAINT "CodingTest_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestProblem" ADD CONSTRAINT "TestProblem_testId_fkey" FOREIGN KEY ("testId") REFERENCES "CodingTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSession" ADD CONSTRAINT "TestSession_testId_fkey" FOREIGN KEY ("testId") REFERENCES "CodingTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSession" ADD CONSTRAINT "TestSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSubmission" ADD CONSTRAINT "TestSubmission_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "TestProblem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSubmission" ADD CONSTRAINT "TestSubmission_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPenalty" ADD CONSTRAINT "TestPenalty_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Judge0KeyPool" ADD CONSTRAINT "Judge0KeyPool_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
