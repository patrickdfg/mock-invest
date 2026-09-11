/** 구글 로그인 리다이렉트에 실려오는 error 코드를 한국어 문구로 */
export const AUTH_ERRORS: Record<string, string> = {
  google_disabled: '구글 로그인이 설정되어 있지 않습니다. 관리자에게 문의하세요.',
  google_canceled: '구글 로그인을 취소했습니다.',
  google_failed: '구글 로그인에 실패했습니다. 다시 시도해주세요.',
  state_mismatch: '보안 검증에 실패했습니다. 처음부터 다시 시도해주세요.',
  invite_required: '처음 가입하려면 초대코드가 필요합니다. 초대코드를 입력한 뒤 구글 버튼을 눌러주세요.',
};

export const authErrorMessage = (code: string | null) =>
  (code && AUTH_ERRORS[code]) || '';
