-- CreateEnum
CREATE TYPE "DocumentPeriodicity" AS ENUM ('annual', 'semiannual', 'once', 'on_change', 'other');

-- DropIndex
DROP INDEX "athlete_documents_athleteId_documentTypeId_referenceYear_key";

-- AlterTable
ALTER TABLE "athlete_documents"
ADD COLUMN "expirationDate" TIMESTAMP(3),
ADD COLUMN "filePath" TEXT,
ADD COLUMN "fileSize" INTEGER,
ADD COLUMN "issueDate" TIMESTAMP(3),
ADD COLUMN "mimeType" TEXT,
ADD COLUMN "originalFileName" TEXT,
ADD COLUMN "rejectionReason" TEXT,
ADD COLUMN "replacedByDocumentId" UUID,
ADD COLUMN "reviewedByUserId" UUID,
ADD COLUMN "uploadedByUserId" UUID;

-- AlterTable
ALTER TABLE "document_types"
ADD COLUMN "appliesToAdults" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "appliesToMinors" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "isRequired" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notes" TEXT,
ADD COLUMN "periodicity" "DocumentPeriodicity" NOT NULL DEFAULT 'annual',
ADD COLUMN "requiresExpirationDate" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "athlete_documents_athleteId_documentTypeId_referenceYear_idx" ON "athlete_documents"("athleteId", "documentTypeId", "referenceYear");

-- CreateIndex
CREATE INDEX "athlete_documents_uploadedByUserId_idx" ON "athlete_documents"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "athlete_documents_reviewedByUserId_idx" ON "athlete_documents"("reviewedByUserId");

-- CreateIndex
CREATE INDEX "athlete_documents_replacedByDocumentId_idx" ON "athlete_documents"("replacedByDocumentId");

-- AddForeignKey
ALTER TABLE "athlete_documents" ADD CONSTRAINT "athlete_documents_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_documents" ADD CONSTRAINT "athlete_documents_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_documents" ADD CONSTRAINT "athlete_documents_replacedByDocumentId_fkey" FOREIGN KEY ("replacedByDocumentId") REFERENCES "athlete_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed initial annual document types.
INSERT INTO "document_types" (
  "id",
  "name",
  "description",
  "isRequired",
  "requiresExpirationDate",
  "periodicity",
  "appliesToMinors",
  "appliesToAdults",
  "isAnnual",
  "requiresReview",
  "isActive",
  "createdAt",
  "updatedAt"
) VALUES
  (gen_random_uuid(), 'Atestado médico', 'Documento crítico para comprovar aptidão para atividade física.', true, true, 'annual', true, true, true, true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Ficha cadastral anual', 'Ficha cadastral atualizada do atleta.', true, false, 'annual', true, true, true, true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Autorização de participação', 'Autorização para participação nas atividades da associação.', true, false, 'annual', true, false, true, true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Autorização de uso de imagem', 'Autorização para uso institucional de imagem.', true, false, 'annual', true, true, true, true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Termo de responsabilidade', 'Termo de ciência e responsabilidade do atleta ou responsável.', true, false, 'annual', true, true, true, true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Documento do atleta', 'Documento de identificação do atleta.', true, false, 'on_change', true, true, false, true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Documento do responsável', 'Documento de identificação do responsável legal.', true, false, 'on_change', true, false, false, true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Comprovante de endereço', 'Comprovante de endereço atualizado.', true, false, 'annual', true, true, true, true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Declaração escolar', 'Declaração escolar atualizada do atleta.', false, false, 'annual', true, false, true, true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Formulário médico', 'Formulário médico interno com informações de saúde.', true, false, 'annual', true, true, true, true, true, NOW(), NOW()),
  (gen_random_uuid(), 'Outro', 'Tipo genérico para documentos complementares.', false, false, 'other', true, true, false, true, true, NOW(), NOW())
ON CONFLICT ("name") DO NOTHING;
