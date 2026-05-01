-- AlterTable
ALTER TABLE "MeetingAttendee" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE "MeetingAttendee" ADD COLUMN     "respondedAt" TIMESTAMP(3);

-- Existing rows pre-date the RSVP feature, so treat them as already accepted
-- to keep meetings on those users' calendars without requiring a re-RSVP.
UPDATE "MeetingAttendee" SET "status" = 'accepted', "respondedAt" = NOW();

-- CreateIndex
CREATE INDEX "MeetingAttendee_userId_status_idx" ON "MeetingAttendee"("userId", "status");
