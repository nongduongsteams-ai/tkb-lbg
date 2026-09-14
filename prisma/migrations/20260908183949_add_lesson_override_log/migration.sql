-- AlterTable
ALTER TABLE "teaching_schedules" ADD COLUMN     "auto_lesson_num" INTEGER,
ADD COLUMN     "is_manual_override" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "lesson_override_logs" (
    "id" TEXT NOT NULL,
    "schedule_id" TEXT NOT NULL,
    "week_number" INTEGER NOT NULL,
    "class_name" TEXT NOT NULL,
    "subject_name" TEXT NOT NULL,
    "teacher_name" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "period" INTEGER NOT NULL,
    "from_lesson_num" INTEGER NOT NULL,
    "to_lesson_num" INTEGER NOT NULL,
    "from_lesson_name" TEXT NOT NULL,
    "to_lesson_name" TEXT NOT NULL,
    "reason" TEXT,
    "is_reverted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_override_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "lesson_override_logs" ADD CONSTRAINT "lesson_override_logs_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "teaching_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
