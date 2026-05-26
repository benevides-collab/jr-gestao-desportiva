-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RoleSlug" AS ENUM ('admin', 'diretoria', 'secretaria', 'professor', 'financeiro', 'consulta');

-- CreateEnum
CREATE TYPE "AthleteStatus" AS ENUM ('active', 'inactive', 'away', 'trial');

-- CreateEnum
CREATE TYPE "AthleteDocumentStatus" AS ENUM ('pending', 'uploaded', 'under_review', 'approved', 'rejected', 'expiring', 'expired', 'waived');

-- CreateEnum
CREATE TYPE "MonthlyFeeStatus" AS ENUM ('open', 'paid', 'overdue', 'exempt', 'partial', 'canceled');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'absent', 'justified_absence', 'late', 'medical_leave', 'partial');

-- CreateEnum
CREATE TYPE "StaffMemberType" AS ENUM ('teacher', 'assistant', 'coordinator', 'admin', 'finance');

-- CreateEnum
CREATE TYPE "GuardianType" AS ENUM ('mother', 'father', 'legal_guardian', 'relative', 'other');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('female', 'male', 'non_binary', 'not_informed');

-- CreateEnum
CREATE TYPE "BloodType" AS ENUM ('a_positive', 'a_negative', 'b_positive', 'b_negative', 'ab_positive', 'ab_negative', 'o_positive', 'o_negative', 'unknown');

-- CreateEnum
CREATE TYPE "CompetitionAthleteStatus" AS ENUM ('called', 'confirmed', 'declined', 'attended', 'absent');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'pix', 'debit_card', 'credit_card', 'bank_transfer', 'boleto', 'other');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "slug" "RoleSlug" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athletes" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "preferredName" TEXT,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "cpf" TEXT,
    "rg" TEXT,
    "gender" "Gender",
    "phone" TEXT,
    "email" TEXT,
    "status" "AthleteStatus" NOT NULL DEFAULT 'trial',
    "notes" TEXT,
    "addressId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athletes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guardians" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "cpf" TEXT,
    "rg" TEXT,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "type" "GuardianType" NOT NULL DEFAULT 'other',
    "addressId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_guardians" (
    "id" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "guardianId" UUID NOT NULL,
    "relationship" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "canPickup" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athlete_guardians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL,
    "postalCode" TEXT,
    "street" TEXT NOT NULL,
    "number" TEXT,
    "complement" TEXT,
    "neighborhood" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Brasil',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schools" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "addressId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_schools" (
    "id" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "grade" TEXT,
    "shift" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athlete_schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctors" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "specialty" TEXT,
    "crm" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_medical_infos" (
    "id" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "doctorId" UUID,
    "bloodType" "BloodType",
    "allergies" TEXT,
    "medications" TEXT,
    "diagnoses" TEXT,
    "restrictions" TEXT,
    "emergencyNotes" TEXT,
    "healthInsurance" TEXT,
    "healthInsuranceCard" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athlete_medical_infos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modalities" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modalities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_locations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "addressId" UUID,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_members" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "documentNumber" TEXT,
    "type" "StaffMemberType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_classes" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "modalityId" UUID NOT NULL,
    "trainingLocationId" UUID NOT NULL,
    "teacherId" UUID NOT NULL,
    "assistantId" UUID,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_schedules" (
    "id" UUID NOT NULL,
    "trainingClassId" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_classes" (
    "id" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "trainingClassId" UUID NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athlete_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_types" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isAnnual" BOOLEAN NOT NULL DEFAULT false,
    "requiresReview" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_documents" (
    "id" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "documentTypeId" UUID NOT NULL,
    "status" "AthleteDocumentStatus" NOT NULL DEFAULT 'pending',
    "referenceYear" INTEGER,
    "fileName" TEXT,
    "fileUrl" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "athlete_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "trainingClassId" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'present',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_athletes" (
    "id" UUID NOT NULL,
    "competitionId" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "status" "CompetitionAthleteStatus" NOT NULL DEFAULT 'called',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competition_athletes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_fees" (
    "id" UUID NOT NULL,
    "athleteId" UUID NOT NULL,
    "referenceMonth" INTEGER NOT NULL,
    "referenceYear" INTEGER NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "MonthlyFeeStatus" NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_fees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "monthlyFeeId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "receiptCode" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_roleId_idx" ON "users"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_slug_key" ON "roles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "athletes_cpf_key" ON "athletes"("cpf");

-- CreateIndex
CREATE INDEX "athletes_addressId_idx" ON "athletes"("addressId");

-- CreateIndex
CREATE INDEX "athletes_status_idx" ON "athletes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "guardians_cpf_key" ON "guardians"("cpf");

-- CreateIndex
CREATE INDEX "guardians_addressId_idx" ON "guardians"("addressId");

-- CreateIndex
CREATE INDEX "athlete_guardians_guardianId_idx" ON "athlete_guardians"("guardianId");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_guardians_athleteId_guardianId_key" ON "athlete_guardians"("athleteId", "guardianId");

-- CreateIndex
CREATE INDEX "schools_addressId_idx" ON "schools"("addressId");

-- CreateIndex
CREATE INDEX "athlete_schools_schoolId_idx" ON "athlete_schools"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_schools_athleteId_schoolId_startedAt_key" ON "athlete_schools"("athleteId", "schoolId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_medical_infos_athleteId_key" ON "athlete_medical_infos"("athleteId");

-- CreateIndex
CREATE INDEX "athlete_medical_infos_doctorId_idx" ON "athlete_medical_infos"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "modalities_name_key" ON "modalities"("name");

-- CreateIndex
CREATE INDEX "training_locations_addressId_idx" ON "training_locations"("addressId");

-- CreateIndex
CREATE INDEX "staff_members_type_idx" ON "staff_members"("type");

-- CreateIndex
CREATE INDEX "training_classes_modalityId_idx" ON "training_classes"("modalityId");

-- CreateIndex
CREATE INDEX "training_classes_trainingLocationId_idx" ON "training_classes"("trainingLocationId");

-- CreateIndex
CREATE INDEX "training_classes_teacherId_idx" ON "training_classes"("teacherId");

-- CreateIndex
CREATE INDEX "training_classes_assistantId_idx" ON "training_classes"("assistantId");

-- CreateIndex
CREATE INDEX "class_schedules_trainingClassId_idx" ON "class_schedules"("trainingClassId");

-- CreateIndex
CREATE INDEX "athlete_classes_trainingClassId_idx" ON "athlete_classes"("trainingClassId");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_classes_athleteId_trainingClassId_key" ON "athlete_classes"("athleteId", "trainingClassId");

-- CreateIndex
CREATE UNIQUE INDEX "document_types_name_key" ON "document_types"("name");

-- CreateIndex
CREATE INDEX "athlete_documents_documentTypeId_idx" ON "athlete_documents"("documentTypeId");

-- CreateIndex
CREATE INDEX "athlete_documents_status_idx" ON "athlete_documents"("status");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_documents_athleteId_documentTypeId_referenceYear_key" ON "athlete_documents"("athleteId", "documentTypeId", "referenceYear");

-- CreateIndex
CREATE INDEX "attendances_trainingClassId_date_idx" ON "attendances"("trainingClassId", "date");

-- CreateIndex
CREATE INDEX "attendances_status_idx" ON "attendances"("status");

-- CreateIndex
CREATE UNIQUE INDEX "attendances_athleteId_trainingClassId_date_key" ON "attendances"("athleteId", "trainingClassId", "date");

-- CreateIndex
CREATE INDEX "competition_athletes_athleteId_idx" ON "competition_athletes"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "competition_athletes_competitionId_athleteId_key" ON "competition_athletes"("competitionId", "athleteId");

-- CreateIndex
CREATE INDEX "monthly_fees_status_idx" ON "monthly_fees"("status");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_fees_athleteId_referenceMonth_referenceYear_key" ON "monthly_fees"("athleteId", "referenceMonth", "referenceYear");

-- CreateIndex
CREATE INDEX "payments_monthlyFeeId_idx" ON "payments"("monthlyFeeId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athletes" ADD CONSTRAINT "athletes_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_guardians" ADD CONSTRAINT "athlete_guardians_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_guardians" ADD CONSTRAINT "athlete_guardians_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_schools" ADD CONSTRAINT "athlete_schools_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_schools" ADD CONSTRAINT "athlete_schools_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_medical_infos" ADD CONSTRAINT "athlete_medical_infos_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_medical_infos" ADD CONSTRAINT "athlete_medical_infos_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_locations" ADD CONSTRAINT "training_locations_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_classes" ADD CONSTRAINT "training_classes_modalityId_fkey" FOREIGN KEY ("modalityId") REFERENCES "modalities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_classes" ADD CONSTRAINT "training_classes_trainingLocationId_fkey" FOREIGN KEY ("trainingLocationId") REFERENCES "training_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_classes" ADD CONSTRAINT "training_classes_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "staff_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_classes" ADD CONSTRAINT "training_classes_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_trainingClassId_fkey" FOREIGN KEY ("trainingClassId") REFERENCES "training_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_classes" ADD CONSTRAINT "athlete_classes_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_classes" ADD CONSTRAINT "athlete_classes_trainingClassId_fkey" FOREIGN KEY ("trainingClassId") REFERENCES "training_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_documents" ADD CONSTRAINT "athlete_documents_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_documents" ADD CONSTRAINT "athlete_documents_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_trainingClassId_fkey" FOREIGN KEY ("trainingClassId") REFERENCES "training_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_athletes" ADD CONSTRAINT "competition_athletes_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_athletes" ADD CONSTRAINT "competition_athletes_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_fees" ADD CONSTRAINT "monthly_fees_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athletes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_monthlyFeeId_fkey" FOREIGN KEY ("monthlyFeeId") REFERENCES "monthly_fees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
