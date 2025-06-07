/*
  Warnings:

  - You are about to drop the column `assignmentId` on the `Problem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Problem" DROP CONSTRAINT "Problem_assignmentId_fkey";

-- AlterTable
ALTER TABLE "Problem" DROP COLUMN "assignmentId";

-- CreateTable
CREATE TABLE "_AssignmentToProblem" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AssignmentToProblem_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AssignmentToProblem_B_index" ON "_AssignmentToProblem"("B");

-- AddForeignKey
ALTER TABLE "_AssignmentToProblem" ADD CONSTRAINT "_AssignmentToProblem_A_fkey" FOREIGN KEY ("A") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AssignmentToProblem" ADD CONSTRAINT "_AssignmentToProblem_B_fkey" FOREIGN KEY ("B") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
