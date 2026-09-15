-- AI 투자 습관 진단 결과 저장

-- CreateTable
CREATE TABLE "AiDiagnosis" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiDiagnosis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiDiagnosis_userId_createdAt_idx" ON "AiDiagnosis"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "AiDiagnosis" ADD CONSTRAINT "AiDiagnosis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
