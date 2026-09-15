import { handler, ok, requireUser } from '@/lib/api';
import { AI_LIMITS, getQuota, isAiEnabled, latestDiagnosis, runDiagnosis } from '@/lib/ai';

export const dynamic = 'force-dynamic';
// 모델 응답이 20~40초 걸릴 수 있어 서버리스 기본 제한시간을 늘린다
export const maxDuration = 60;

/** 최근 진단 + 남은 횟수 */
export const GET = handler(async () => {
  const user = await requireUser();
  const [latest, quota] = await Promise.all([latestDiagnosis(user.id), getQuota(user.id)]);
  return ok({ enabled: isAiEnabled(), latest, quota, limits: AI_LIMITS });
});

/** 새 진단 실행 */
export const POST = handler(async () => {
  const user = await requireUser();
  const diagnosis = await runDiagnosis(user.id);
  return ok({ diagnosis, quota: await getQuota(user.id) });
});
