-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('MEDICAL', 'EXEMPTION', 'FAMILY', 'OTHER');

-- CreateTable
CREATE TABLE "Certificate" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "dateFrom" DATE NOT NULL,
    "dateTo" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "type" "CertificateType" NOT NULL DEFAULT 'MEDICAL',
    "documentNumber" TEXT,
    "comment" TEXT,
    "photoData" TEXT,
    "photoMimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Attendance"
    ADD COLUMN "isExcused" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "certificateId" INTEGER;

-- CreateIndex
CREATE INDEX "Certificate_studentId_idx" ON "Certificate"("studentId");

-- CreateIndex
CREATE INDEX "Certificate_dateFrom_dateTo_idx" ON "Certificate"("dateFrom", "dateTo");

-- CreateIndex
CREATE INDEX "Certificate_type_idx" ON "Certificate"("type");

-- CreateIndex
CREATE INDEX "Attendance_isExcused_idx" ON "Attendance"("isExcused");

-- CreateIndex
CREATE INDEX "Attendance_certificateId_idx" ON "Attendance"("certificateId");

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
