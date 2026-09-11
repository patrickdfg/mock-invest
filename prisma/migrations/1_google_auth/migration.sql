-- 구글 로그인 지원
-- 구글 가입자는 비밀번호가 없으므로 password 를 nullable 로 바꾼다.

ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

ALTER TABLE "User" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'local';
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;
ALTER TABLE "User" ADD COLUMN "image" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
