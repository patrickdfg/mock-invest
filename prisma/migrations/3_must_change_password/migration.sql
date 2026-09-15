-- 관리자 비밀번호 초기화 후 강제 변경 플래그
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
