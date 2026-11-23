import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.resolve(__dirname, '../data/attendance-db.json');

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to Neon PostgreSQL...');
  await prisma.$connect();
  console.log('Connected successfully!');

  const rawData = fs.readFileSync(DB_FILE, 'utf-8');
  const db = JSON.parse(rawData);

  console.log(`Migrating ${db.students.length} students...`);
  for (const s of db.students) {
    await prisma.student.upsert({
      where: { id: s.id },
      update: { fullName: s.fullName, isActive: s.isActive },
      create: { id: s.id, fullName: s.fullName, isActive: s.isActive },
    });
  }

  console.log(`Migrating ${db.subjects.length} subjects...`);
  for (const sub of db.subjects) {
    await prisma.subject.upsert({
      where: { id: sub.id },
      update: { name: sub.name, isActive: sub.isActive },
      create: { id: sub.id, name: sub.name, isActive: sub.isActive },
    });
  }

  // ONLY 2026-11-23
  const TARGET_DATE = '2026-11-23';
  const targetLessons = (db.lessons || []).filter((l: any) => l.date === TARGET_DATE);
  console.log(`Found ${targetLessons.length} lessons for ${TARGET_DATE}...`);

  for (const l of targetLessons) {
    const [year, month, day] = l.date.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    const lesson = await prisma.lesson.upsert({
      where: {
        date_subjectId_lessonNumber: {
          date: dateObj,
          subjectId: l.subjectId,
          lessonNumber: l.lessonNumber,
        },
      },
      update: {},
      create: {
        id: l.id,
        date: dateObj,
        subjectId: l.subjectId,
        lessonNumber: l.lessonNumber,
      },
    });

    const attendances = (db.attendances || []).filter((a: any) => a.lessonId === l.id);
    console.log(`Migrating ${attendances.length} attendances for lesson ${l.id}...`);

    for (const att of attendances) {
      await prisma.attendance.upsert({
        where: {
          lessonId_studentId: {
            lessonId: lesson.id,
            studentId: att.studentId,
          },
        },
        update: { status: att.status },
        create: {
          lessonId: lesson.id,
          studentId: att.studentId,
          status: att.status,
        },
      });
    }
  }

  // Update Postgres serial sequences
  console.log('Updating Postgres ID sequences...');
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Student"', 'id'), coalesce(max(id), 1)) FROM "Student";`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Subject"', 'id'), coalesce(max(id), 1)) FROM "Subject";`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Lesson"', 'id'), coalesce(max(id), 1)) FROM "Lesson";`);
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Attendance"', 'id'), coalesce(max(id), 1)) FROM "Attendance";`);

  const studentCount = await prisma.student.count();
  const subjectCount = await prisma.subject.count();
  const lessonCount = await prisma.lesson.count();
  const attendanceCount = await prisma.attendance.count();

  console.log('Migration completed successfully!');
  console.log(`Database status:
  - Students: ${studentCount}
  - Subjects: ${subjectCount}
  - Lessons (only 2026-11-23): ${lessonCount}
  - Attendances: ${attendanceCount}
  `);
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
